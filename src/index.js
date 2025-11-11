const { startServer } = require('./server');

const PORT = process.env.PORT || 3000;

// Start the server
startServer(PORT)
  .then(({ server, ffmpeg, cleanup }) => {
    // Graceful shutdown handlers
    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      await cleanup();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch(err => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  });
