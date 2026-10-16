const request = require('supertest');
const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_1234567890_super_secure';

const app = require('../src/app');
const { setupMockDB } = require('./mockDb');

// Color helpers for clean terminal output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

let passed = 0;
let failed = 0;

const assert = (condition, description) => {
  if (condition) {
    console.log(`  ${colors.green('✔')} ${description}`);
    passed++;
  } else {
    console.error(`  ${colors.red('✖')} ${description}`);
    failed++;
  }
};

const runAllTests = async () => {
  console.log(`\n${colors.bold(colors.cyan('========================================'))}`);
  console.log(`${colors.bold(colors.cyan('  Secure Notes REST API - Test Suite   '))}`);
  console.log(`${colors.bold(colors.cyan('========================================'))}\n`);

  let isRealMongo = false;
  try {
    if (process.env.TEST_WITH_REAL_MONGO === 'true') {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_notes_test_db';
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log(`${colors.cyan('[Setup]')} Connected to real MongoDB at ${uri}`);
      isRealMongo = true;

      // Clean test collections
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    } else {
      setupMockDB();
      console.log(`${colors.cyan('[Setup]')} Using In-Memory Database Harness (zero external dependencies).`);
    }

    // ----------------------------------------------------
    // 1. Health & Root Endpoints
    // ----------------------------------------------------
    console.log(`\n${colors.bold('1. API Root & Health Endpoints')}`);
    {
      const res = await request(app).get('/');
      assert(res.status === 200, 'GET / returns 200 OK');
      assert(res.body.success === true, 'GET / includes API documentation & success=true');

      // Test browser HTML request
      const htmlRes = await request(app).get('/').set('Accept', 'text/html');
      assert(htmlRes.status === 200, 'GET / with text/html returns 200 OK');
      assert(htmlRes.text.includes('Secure Notes'), 'Frontend index.html is served to web browsers');

      const healthRes = await request(app).get('/api/health');
      assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
      assert(healthRes.body.status === 'healthy', 'GET /api/health returns healthy status');
    }

    // ----------------------------------------------------
    // 2. Authentication: User Registration & Login
    // ----------------------------------------------------
    console.log(`\n${colors.bold('2. Authentication & JWT Issuance')}`);
    let userAToken = '';
    let userAId = '';
    let userBToken = '';
    let userBId = '';

    // Register User A
    {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Cooper',
          email: 'alice@example.com',
          password: 'Password123!'
        });

      assert(res.status === 201, 'POST /api/auth/register returns 201 Created');
      assert(Boolean(res.body.data.token), 'Registration returns a valid JWT token');
      assert(res.body.data.user.email === 'alice@example.com', 'User data returned without password hash');
      assert(res.body.data.user.password === undefined, 'Password is not leaked in response');

      userAToken = res.body.data.token;
      userAId = res.body.data.user.id;
    }

    // Reject duplicate registration
    {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Duplicate',
          email: 'alice@example.com',
          password: 'Password123!'
        });

      assert(res.status === 400, 'Duplicate email registration returns 400 Bad Request');
    }

    // Validation failure: short password
    {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bob',
          email: 'bob@example.com',
          password: '123'
        });

      assert(res.status === 400, 'Registration with password < 6 characters returns 400 Bad Request');
      assert(res.body.errors.some(e => e.field === 'password'), 'Validation error points to password field');
    }

    // Login with invalid credentials
    {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'WrongPassword!'
        });

      assert(res.status === 401, 'Login with incorrect password returns 401 Unauthorized');
    }

    // Login with valid credentials
    {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'Password123!'
        });

      assert(res.status === 200, 'Login with correct credentials returns 200 OK');
      assert(Boolean(res.body.data.token), 'Login response issues a valid JWT token');
      userAToken = res.body.data.token;
    }

    // Register User B for security cross-user isolation tests
    {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bob Smith',
          email: 'bob@example.com',
          password: 'Password456!'
        });

      assert(res.status === 201, 'User B registered successfully');
      userBToken = res.body.data.token;
      userBId = res.body.data.user.id;
    }

    // Profile retrieval with valid token
    {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);

      assert(res.status === 200, 'GET /api/auth/me returns 200 OK with valid JWT');
      assert(res.body.data.user.email === 'alice@example.com', 'Returns profile of authenticated user');
    }

    // Profile retrieval without token
    {
      const res = await request(app).get('/api/auth/me');
      assert(res.status === 401, 'GET /api/auth/me without token returns 401 Unauthorized');
    }

    // Profile retrieval with invalid token
    {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_garbage_token');

      assert(res.status === 401, 'GET /api/auth/me with invalid token returns 401 Unauthorized');
    }

    // Change password without token
    {
      const res = await request(app)
        .put('/api/auth/change-password')
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewSecurePassword789!'
        });

      assert(res.status === 401, 'PUT /api/auth/change-password without token returns 401 Unauthorized');
    }

    // Change password with wrong current password
    {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          currentPassword: 'IncorrectOldPassword!',
          newPassword: 'NewSecurePassword789!'
        });

      assert(res.status === 400, 'Change password with incorrect current password returns 400 Bad Request');
    }

    // Change password with new password < 6 chars
    {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: '123'
        });

      assert(res.status === 400, 'Change password with new password < 6 chars returns 400 Bad Request');
    }

    // Change password successfully
    {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewSecurePassword789!'
        });

      assert(res.status === 200, 'PUT /api/auth/change-password succeeds with 200 OK');
      assert(res.body.message === 'Password changed successfully', 'Success message confirmed');
    }

    // Verify login with new password works
    {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'NewSecurePassword789!'
        });

      assert(res.status === 200, 'Login with new updated password succeeds with 200 OK');
      userAToken = res.body.data.token;
    }

    // Verify login with old password fails
    {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'Password123!'
        });

      assert(res.status === 401, 'Login with obsolete old password is rejected with 401 Unauthorized');
    }

    // ----------------------------------------------------
    // 3. Note Management (CRUD)
    // ----------------------------------------------------
    console.log(`\n${colors.bold('3. Note Management (CRUD)')}`);
    let noteAId = '';
    let noteBId = '';

    // Create Note without token (Blocked)
    {
      const res = await request(app)
        .post('/api/notes')
        .send({ title: 'Unauthenticated Note', content: 'Should fail' });

      assert(res.status === 401, 'POST /api/notes without token is blocked with 401 Unauthorized');
    }

    // Create Note for User A
    {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Alice Secrets & Credentials',
          content: 'Confidential encrypted project notes',
          tags: ['security', 'confidential'],
          isPinned: true
        });

      assert(res.status === 201, 'POST /api/notes creates note for User A with 201 Created');
      assert(res.body.data.title === 'Alice Secrets & Credentials', 'Note title correctly saved');
      assert(res.body.data.user.toString() === userAId.toString(), 'Note is linked to User A ObjectId');
      noteAId = res.body.data._id.toString();
    }

    // Create Note for User B
    {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          title: 'Bob Grocery List',
          content: 'Apples, Milk, Bread, Coffee',
          tags: ['personal']
        });

      assert(res.status === 201, 'POST /api/notes creates note for User B with 201 Created');
      assert(res.body.data.user.toString() === userBId.toString(), 'Note is linked to User B ObjectId');
      noteBId = res.body.data._id.toString();
    }

    // ----------------------------------------------------
    // 4. Security & Data Isolation (Access Control)
    // ----------------------------------------------------
    console.log(`\n${colors.bold('4. Security & User Data Isolation')}`);

    // User A reads their own notes list
    {
      const res = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${userAToken}`);

      assert(res.status === 200, 'GET /api/notes returns 200 OK for User A');
      assert(res.body.count === 1, 'User A only sees 1 note');
      assert(res.body.data[0]._id.toString() === noteAId, 'User A sees only their own note');
      assert(!res.body.data.some(n => n._id.toString() === noteBId), 'User A CANNOT see User B note in listing');
    }

    // User B reads their own notes list
    {
      const res = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${userBToken}`);

      assert(res.status === 200, 'GET /api/notes returns 200 OK for User B');
      assert(res.body.count === 1, 'User B only sees 1 note');
      assert(res.body.data[0]._id.toString() === noteBId, 'User B sees only their own note');
      assert(!res.body.data.some(n => n._id.toString() === noteAId), 'User B CANNOT see User A note in listing');
    }

    // User B attempts to access User A's note by ID (Direct Object Reference Attack)
    {
      const res = await request(app)
        .get(`/api/notes/${noteAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert(res.status === 403, 'Cross-user read: User B accessing User A note is FORBIDDEN (403)');
    }

    // User B attempts to modify User A's note
    {
      const res = await request(app)
        .put(`/api/notes/${noteAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ title: 'Hacked by User B!' });

      assert(res.status === 403, 'Cross-user update: User B updating User A note is FORBIDDEN (403)');
    }

    // User B attempts to delete User A's note
    {
      const res = await request(app)
        .delete(`/api/notes/${noteAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert(res.status === 403, 'Cross-user delete: User B deleting User A note is FORBIDDEN (403)');
    }

    // ----------------------------------------------------
    // 5. Update and Delete by Legitimate Owner
    // ----------------------------------------------------
    console.log(`\n${colors.bold('5. Update & Delete by Note Owner')}`);

    // User A updates their own note
    {
      const res = await request(app)
        .put(`/api/notes/${noteAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Alice Updated Secrets',
          content: 'Updated content with new security keys'
        });

      assert(res.status === 200, 'Owner successfully updates note (200 OK)');
      assert(res.body.data.title === 'Alice Updated Secrets', 'Updated title reflected in response');
    }

    // User A deletes their own note
    {
      const res = await request(app)
        .delete(`/api/notes/${noteAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert(res.status === 200, 'Owner successfully deletes note (200 OK)');
    }

    // Verify deleted note is no longer accessible
    {
      const res = await request(app)
        .get(`/api/notes/${noteAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      assert(res.status === 404, 'Accessing deleted note returns 404 Not Found');
    }

    console.log(`\n${colors.bold('========================================')}`);
    console.log(`  Tests Passed: ${colors.green(passed.toString())}`);
    console.log(`  Tests Failed: ${failed > 0 ? colors.red(failed.toString()) : colors.green('0')}`);
    console.log(`${colors.bold('========================================')}\n`);

    if (isRealMongo) {
      await mongoose.disconnect();
    }
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error(`\n${colors.red('Test suite execution error:')}`, err);
    if (isRealMongo) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

runAllTests();
