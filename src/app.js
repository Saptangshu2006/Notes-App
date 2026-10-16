const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security HTTP headers (allowing frontend script/style assets)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Serve static frontend assets (css, js, images) without overriding GET /
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check & API root endpoint
app.get('/', (req, res) => {
  // If requested by a web browser, serve the frontend application
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }

  // Otherwise return JSON API specifications
  res.status(200).json({
    success: true,
    message: 'Welcome to the Secure Notes REST API',
    version: '1.0.0',
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (Protected)',
        changePassword: 'PUT /api/auth/change-password (Protected)'
      },
      notes: {
        list: 'GET /api/notes (Protected)',
        create: 'POST /api/notes (Protected)',
        getOne: 'GET /api/notes/:id (Protected)',
        update: 'PUT /api/notes/:id (Protected)',
        delete: 'DELETE /api/notes/:id (Protected)'
      }
    }
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
