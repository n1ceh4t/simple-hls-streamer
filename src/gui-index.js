const { startServer } = require('./server');
const SystemTrayGUI = require('./gui');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         Simple HLS Streamer - GUI Mode                    ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('System tray icon loaded. Right-click the icon to:');
console.log('  • Start/Stop the server');
console.log('  • Open the web player');
console.log('  • View API documentation');
console.log('  • Exit the application');
console.log('');

// Create a server wrapper for the GUI
const serverWrapper = {
  currentInstance: null,
  ffmpegInstance: null,

  async start(port) {
    if (this.currentInstance) {
      throw new Error('Server is already running');
    }

    const { server, ffmpeg, cleanup } = await startServer(port);
    this.currentInstance = server;
    this.ffmpegInstance = ffmpeg;
    this.cleanup = cleanup;

    return server;
  },

  async stop() {
    if (!this.currentInstance) {
      throw new Error('Server is not running');
    }

    // Cleanup FFmpeg streams
    if (this.cleanup) {
      await this.cleanup();
    }

    // Close the server
    return new Promise((resolve) => {
      this.currentInstance.close(() => {
        this.currentInstance = null;
        this.ffmpegInstance = null;
        this.cleanup = null;
        resolve();
      });
    });
  }
};

// Initialize the system tray GUI
let gui;
try {
  gui = new SystemTrayGUI(serverWrapper);
  console.log('[GUI] System tray initialized successfully!');
  console.log('[GUI] Look for the icon in your system tray');
  console.log('');
} catch (error) {
  console.error('[GUI] Failed to initialize system tray:', error.message);
  console.error('[GUI] Full error:', error);
  console.log('');
  console.log('FALLBACK: Starting server in CLI mode instead...');
  console.log('');

  // Start server in CLI mode as fallback
  const PORT = process.env.PORT || 3000;
  startServer(PORT).then(({ server, ffmpeg, cleanup }) => {
    console.log('[GUI] Server started in CLI mode (no system tray)');
    console.log('[GUI] Open http://localhost:' + PORT + '/player.html in your browser');

    process.on('SIGINT', async () => {
      console.log('\n[GUI] Shutting down...');
      await cleanup();
      process.exit(0);
    });
  }).catch(err => {
    console.error('[GUI] Failed to start server:', err);
    process.exit(1);
  });
}

// Handle process termination
if (gui) {
  process.on('SIGINT', async () => {
    await gui.exit();
  });

  process.on('SIGTERM', async () => {
    await gui.exit();
  });

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    console.error('[GUI] Uncaught exception:', err);
    if (gui) {
      gui.exit();
    } else {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[GUI] Unhandled rejection at:', promise, 'reason:', reason);
  });
}

// Keep process alive
process.stdin.resume();
