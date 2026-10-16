require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start HTTP server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(
        `[Server] Secure Notes API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
      );
      console.log(`[Server] Local URL: http://localhost:${PORT}`);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error(`[Unhandled Rejection] ${err.message}`);
      // Close server & exit process
      server.close(() => process.exit(1));
    });

    // Graceful shutdown on SIGTERM / SIGINT
    const shutdown = () => {
      console.log('\n[Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error(`[Startup Error] Could not start server: ${error.message}`);
  }
};

startServer();
