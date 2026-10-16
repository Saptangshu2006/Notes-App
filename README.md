# 🔒 Secure Notes REST API

A production-ready, lightweight backend RESTful API built with **Node.js**, **Express.js**, **MongoDB (Mongoose)**, and **JSON Web Tokens (JWT)** for securely creating and managing personal notes with strict user isolation.

---

## 🚀 Features

- **User Authentication**: Secure user registration and login with bcrypt password hashing (10 salt rounds) and JWT issuance.
- **Role & Data Isolation (Anti-IDOR)**: Each note is strictly bound to its creator's user ID. Users can never view, update, or delete another user's notes.
- **Full CRUD for Notes**:
  - `POST /api/notes` - Create notes with title, content, tags, and pin status.
  - `GET /api/notes` - Fetch all notes owned by the user (supports search, tag filter, pagination, pinned priority).
  - `GET /api/notes/:id` - Fetch single note (validates ownership).
  - `PUT /api/notes/:id` - Update note (validates ownership).
  - `DELETE /api/notes/:id` - Delete note (validates ownership).
- **Interactive Frontend UI**: Sleek, responsive web dashboard with Login, Registration, Change Password, Real-time search, Tag filtering, Pinned note priority, and full note CRUD.
- **Hardened Security**:
  - **Helmet**: Secures HTTP response headers against well-known web vulnerabilities.
  - **Rate Limiting**: Throttles auth endpoints (`/api/auth/login`, `/api/auth/register`) to protect against brute-force password guessing.
  - **Input Validation**: Schema validation and sanitization using `express-validator`.
  - **Data Privacy**: Passwords are never returned in queries or API responses.
  - **Error Handling**: Centralized error middleware prevents sensitive stack traces from leaking in production.

---

## 🛠 Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Frontend**: Vanilla JS (ES6+), Modern CSS (CSS Grid, Glassmorphism, Responsive design), FontAwesome
- **Database**: MongoDB via Mongoose ODM
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **Security & Utilities**: `helmet`, `cors`, `express-rate-limit`, `express-validator`, `morgan`, `dotenv`
- **Testing**: `supertest`

---

## 📁 Project Structure

```text
Notes App/
├── public/                       # Frontend application
│   ├── css/
│   │   └── style.css             # Responsive styling & themes
│   ├── js/
│   │   └── app.js                # Frontend client logic & API bindings
│   └── index.html                # Single-page application entry point
├── src/
│   ├── config/
│   │   └── db.js                 # MongoDB connection handler
│   ├── controllers/
│   │   ├── authController.js     # User registration, login & profile
│   │   └── noteController.js     # User-isolated note CRUD operations
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & request user attachment
│   │   ├── errorMiddleware.js    # 404 handler and global error formatter
│   │   └── validateMiddleware.js # express-validator rules and handler
│   ├── models/
│   │   ├── Note.js               # Note Schema with compound indexes
│   │   └── User.js               # User Schema with bcrypt pre-save hook
│   ├── routes/
│   │   ├── authRoutes.js         # Auth routing & rate limiting
│   │   └── noteRoutes.js         # Protected Note CRUD routing
│   ├── utils/
│   │   └── generateToken.js      # JWT signing helper
│   ├── app.js                    # Express app configuration & middleware
│   └── server.js                 # Application entry point
├── tests/
│   └── run-tests.js              # Comprehensive automated integration test suite
├── .env                          # Local environment variables
├── .env.example                  # Environment template
├── requests.http                 # VS Code REST Client manual test file
├── package.json
└── README.md
```

---

## ⚙️ Quick Start

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB**: Local MongoDB instance or free cloud cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root (or copy `.env.example`):

```env
PORT=5000
NODE_ENV=development

# MongoDB Connection String (Local or Atlas)
MONGODB_URI=mongodb://localhost:27017/secure_notes_db
# For Atlas, use: mongodb+srv://<username>:<password>@cluster0.mongodb.net/secure_notes_db?retryWrites=true&w=majority

# JWT Secret & Expiry
JWT_SECRET=your_super_secret_jwt_key_here_at_least_32_characters
JWT_EXPIRES_IN=7d

# Allowed CORS Origins
CLIENT_URL=*
```

### 4. Run the Server
- **Development mode** (with nodemon hot-reload):
  ```bash
  npm run dev
  ```
- **Production mode**:
  ```bash
  npm start
  ```

The server will be available at: `http://localhost:5000`

---

## 🧪 Running Automated Tests

Run the full end-to-end integration and security test suite:

```bash
npm test
```

The test suite validates:
1. API Root & Health endpoints.
2. User registration, duplicate email rejection, and input validation.
3. Login verification, credential checking, and JWT issuance.
4. Protected route access with and without bearer tokens.
5. Note CRUD operations.
6. **Cross-user isolation**: Verifies that User B cannot read, modify, or delete User A's notes (403 Forbidden).

---

## 📖 API Documentation

### Base URL
`http://localhost:5000/api`

### 1. Authentication Endpoints

#### Register a New User
- **URL**: `POST /auth/register`
- **Access**: Public (Rate-limited)
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": "67104be...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "createdAt": "2026-10-16T15:30:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp..."
    }
  }
  ```

#### Login User
- **URL**: `POST /auth/login`
- **Access**: Public (Rate-limited)
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "67104be...",
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp..."
    }
  }
  ```

#### Get Current User Profile
- **URL**: `GET /auth/me`
- **Access**: Private (Requires `Authorization: Bearer <token>`)
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "_id": "67104be...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "createdAt": "2026-10-16T15:30:00.000Z"
      }
    }
  }
  ```

#### Change Password
- **URL**: `PUT /auth/change-password`
- **Access**: Private (Requires `Authorization: Bearer <token>`)
- **Request Body**:
  ```json
  {
    "currentPassword": "Password123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Password changed successfully"
  }
  ```

---

### 2. Note Management Endpoints (All Protected)

> **Important**: All note routes require the header:  
> `Authorization: Bearer <your_jwt_token>`

#### Create a Note
- **URL**: `POST /notes`
- **Request Body**:
  ```json
  {
    "title": "Database Architecture",
    "content": "Use indexed compound queries on user and update timestamps.",
    "tags": ["architecture", "backend"],
    "isPinned": true
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Note created successfully",
    "data": {
      "_id": "67104cc...",
      "user": "67104be...",
      "title": "Database Architecture",
      "content": "Use indexed compound queries on user and update timestamps.",
      "tags": ["architecture", "backend"],
      "isPinned": true,
      "createdAt": "2026-10-16T15:35:00.000Z",
      "updatedAt": "2026-10-16T15:35:00.000Z"
    }
  }
  ```

#### Get All Notes
- **URL**: `GET /notes`
- **Query Parameters (Optional)**:
  - `search`: Filter by keyword in title or content (`?search=database`)
  - `tag`: Filter by tag (`?tag=backend`)
  - `isPinned`: Filter pinned notes (`?isPinned=true`)
  - `page`: Page number (default: 1)
  - `limit`: Notes per page (default: 50)
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 1,
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "data": [
      {
        "_id": "67104cc...",
        "user": "67104be...",
        "title": "Database Architecture",
        "content": "Use indexed compound queries on user and update timestamps.",
        "tags": ["architecture", "backend"],
        "isPinned": true,
        "createdAt": "2026-10-16T15:35:00.000Z",
        "updatedAt": "2026-10-16T15:35:00.000Z"
      }
    ]
  }
  ```

#### Get Note by ID
- **URL**: `GET /notes/:id`
- **Response** (`200 OK`): Returns note object. If the note belongs to another user, responds with `403 Forbidden`.

#### Update Note
- **URL**: `PUT /notes/:id`
- **Request Body** (Any fields to update):
  ```json
  {
    "title": "Updated Architecture",
    "isPinned": false
  }
  ```
- **Response** (`200 OK`): Returns updated note object.

#### Delete Note
- **URL**: `DELETE /notes/:id`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Note deleted successfully"
  }
  ```

---

## 🛡 Security Architecture Highlights

| Security Feature | Implementation Details |
|---|---|
| **Password Storage** | `bcryptjs` with salt round factor 10, pre-save hashing |
| **Token Authentication** | Signed `jsonwebtoken` (HS256) with configurable TTL |
| **Insecure Direct Object Reference (IDOR) Protection** | Strict check: `note.user.toString() === req.user._id.toString()` before read/update/delete |
| **Brute-Force Mitigation** | `express-rate-limit` limits auth routes to 20 attempts per 15 min per IP |
| **Security Headers** | `helmet` configured for Content-Security-Policy, XSS Filter, HSTS, etc. |
| **Input Validation** | `express-validator` validates formats, lengths, and normalizes email |
| **Data Leak Prevention** | Password hash excluded with Mongoose `select: false` |
