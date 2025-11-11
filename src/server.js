const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const FFmpegStreamer = require('./ffmpeg');
const PlaylistManager = require('./playlist');

/**
 * Creates and configures the Express server
 * @returns {Object} { app, ffmpeg, playlist }
 */
function createServer() {
  const app = express();

  // Initialize services
  const ffmpeg = new FFmpegStreamer();
  const playlist = new PlaylistManager('./playlists');

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // ============================================================================
  // IP Whitelist Middleware
  // ============================================================================

  /**
   * Check if an IP address is a local/private address
   * @param {string} ip - IP address to check
   * @returns {boolean} true if the IP is local
   */
  function isLocalIP(ip) {
    // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // IPv6 localhost and link-local
    if (ip === '::1' || ip.startsWith('fe80:')) {
      return true;
    }

    // IPv4 localhost
    if (ip === '127.0.0.1' || ip.startsWith('127.')) {
      return true;
    }

    // Private IPv4 ranges
    const parts = ip.split('.').map(Number);
    if (parts.length === 4) {
      // 10.0.0.0/8
      if (parts[0] === 10) return true;
      // 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      // 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return true;
    }

    return false;
  }

  /**
   * Middleware to restrict API access to local IP addresses only
   */
  function localIPOnly(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    if (isLocalIP(clientIP)) {
      next();
    } else {
      console.warn(`[Security] API access denied for external IP: ${clientIP}`);
      res.status(403).json({
        error: 'Forbidden',
        message: 'API access is restricted to local network only'
      });
    }
  }

  // ============================================================================
  // API Routes
  // ============================================================================

  /**
   * GET /
   * Health check
   */
  app.get('/', localIPOnly, async (req, res) => {
    // Detect GPU on first request (lazy init)
    if (!ffmpeg.gpuInfo) {
      await ffmpeg.detectGPU();
    }

    res.json({
      name: 'Simple HLS Streamer',
      version: '1.0.0',
      status: 'running',
      activeStreams: ffmpeg.getActiveStreams().length,
      gpu: ffmpeg.gpuInfo ? {
        type: ffmpeg.gpuInfo.type,
        hwAccelAvailable: ffmpeg.gpuInfo.hwAccelAvailable
      } : null
    });
  });

  /**
   * GET /api/gpu
   * Get GPU and hardware acceleration info
   */
  app.get('/api/gpu', localIPOnly, async (req, res) => {
    const gpuInfo = await ffmpeg.detectGPU();
    res.json({
      gpu: gpuInfo,
      ffmpegPath: ffmpeg.ffmpegPath,
      recommendation: gpuInfo.hwAccelAvailable
        ? `GPU encoding is available! Streams will use ${gpuInfo.encoder} for hardware acceleration.`
        : 'No GPU detected. Streams will use CPU encoding (libx264).'
    });
  });

  /**
   * POST /api/stream/start
   * Start a new HLS stream
   */
  app.post('/api/stream/start', localIPOnly, async (req, res) => {
    try {
      const { streamId, files, options } = req.body;

      if (!streamId) {
        return res.status(400).json({ error: 'streamId is required' });
      }

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'files array is required and must not be empty' });
      }

      console.log(`[API] Starting stream: ${streamId} with ${files.length} files`);

      // Validate files exist
      const validation = await playlist.validateFiles(files);
      if (validation.missing.length > 0) {
        console.warn(`[API] ${validation.missing.length} files are missing, stream may fail`);
      }

      // Create concat file
      const concatFilePath = await playlist.createConcatFile(streamId, files);

      // Start FFmpeg stream
      const outputDir = path.join(__dirname, '..', 'output', streamId);
      const streamInfo = await ffmpeg.startStream(streamId, concatFilePath, outputDir, options);

      res.json({
        success: true,
        stream: streamInfo,
        validation
      });

    } catch (error) {
      console.error('[API] Error starting stream:', error);
      res.status(500).json({
        error: 'Failed to start stream',
        message: error.message
      });
    }
  });

  /**
   * POST /api/stream/stop
   * Stop an active stream
   */
  app.post('/api/stream/stop', localIPOnly, async (req, res) => {
    try {
      const { streamId } = req.body;

      if (!streamId) {
        return res.status(400).json({ error: 'streamId is required' });
      }

      console.log(`[API] Stopping stream: ${streamId}`);

      await ffmpeg.stopStream(streamId);

      res.json({
        success: true,
        message: `Stream ${streamId} stopped`
      });

    } catch (error) {
      console.error('[API] Error stopping stream:', error);
      res.status(500).json({
        error: 'Failed to stop stream',
        message: error.message
      });
    }
  });

  /**
   * GET /api/streams
   * List all active streams
   */
  app.get('/api/streams', localIPOnly, (req, res) => {
    const streams = ffmpeg.getActiveStreams();
    res.json({
      count: streams.length,
      streams
    });
  });

  /**
   * POST /api/playlist/create
   * Create a concat file from file list
   */
  app.post('/api/playlist/create', localIPOnly, async (req, res) => {
    try {
      const { playlistId, files } = req.body;

      if (!playlistId || !files) {
        return res.status(400).json({ error: 'playlistId and files are required' });
      }

      const concatFilePath = await playlist.createConcatFile(playlistId, files);
      const validation = await playlist.validateFiles(files);

      res.json({
        success: true,
        concatFilePath,
        validation
      });

    } catch (error) {
      console.error('[API] Error creating playlist:', error);
      res.status(500).json({
        error: 'Failed to create playlist',
        message: error.message
      });
    }
  });

  /**
   * GET /api/playlists
   * List all concat files
   */
  app.get('/api/playlists', localIPOnly, async (req, res) => {
    try {
      const concatFiles = await playlist.listConcatFiles();
      res.json({
        count: concatFiles.length,
        files: concatFiles
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list playlists',
        message: error.message
      });
    }
  });

  // ============================================================================
  // HLS Streaming Routes
  // ============================================================================

  /**
   * GET /stream/:streamId/stream.m3u8
   * Serve the HLS master playlist
   */
  app.get('/stream/:streamId/stream.m3u8', async (req, res) => {
    try {
      const { streamId } = req.params;
      // Use process.cwd() instead of __dirname for pkg compatibility
      const m3u8Path = path.join(process.cwd(), 'output', streamId, 'stream.m3u8');

      // Check if file exists
      await fs.access(m3u8Path);

      // Set proper headers for m3u8
      res.set({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.sendFile(m3u8Path);
    } catch (error) {
      console.error(`[HLS] Error serving m3u8 for ${req.params.streamId}:`, error.message);
      res.status(404).json({
        error: 'Stream not found',
        message: 'The requested stream does not exist or is not ready'
      });
    }
  });

  /**
   * GET /stream/:streamId/*.ts
   * Serve HLS segments
   */
  app.get('/stream/:streamId/*.ts', async (req, res) => {
    try {
      const { streamId } = req.params;
      const segmentName = req.params[0] + '.ts';
      // Use process.cwd() instead of __dirname for pkg compatibility
      const segmentPath = path.join(process.cwd(), 'output', streamId, segmentName);

      // Check if file exists
      await fs.access(segmentPath);

      // Set proper headers for TS segments
      res.set({
        'Content-Type': 'video/mp2t',
        'Cache-Control': 'max-age=10'
      });

      res.sendFile(segmentPath);
    } catch (error) {
      res.status(404).send('Segment not found');
    }
  });

  /**
   * Catch-all route for serving any file in output directory
   */
  // Use process.cwd() instead of __dirname for pkg compatibility
  app.use('/stream/:streamId', express.static(path.join(process.cwd(), 'output'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.m3u8')) {
        res.set({
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache'
        });
      } else if (filePath.endsWith('.ts')) {
        res.set({
          'Content-Type': 'video/mp2t',
          'Cache-Control': 'max-age=10'
        });
      }
    }
  }));

  // Serve player.html and other static files
  // Check if running as pkg - use snapshot path for bundled assets
  const isPkg = typeof process.pkg !== 'undefined';
  const staticPath = isPkg ? path.join(__dirname, '..') : process.cwd();
  app.use(express.static(staticPath));

  // ============================================================================
  // Error handling
  // ============================================================================

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  });

  return { app, ffmpeg, playlist };
}

/**
 * Starts the server and returns the server instance
 * @param {number} port - Port to listen on
 * @returns {Promise<Object>} Server instance with { server, ffmpeg, cleanup }
 */
async function startServer(port = 3000) {
  const { app, ffmpeg, playlist } = createServer();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(`
╔════════════════════════════════════════════════════════════╗
║         Simple HLS Streamer                                ║
║         Server running on http://localhost:${port}           ║
╚════════════════════════════════════════════════════════════╝

API Endpoints:
  POST   /api/stream/start      - Start a new HLS stream
  POST   /api/stream/stop       - Stop an active stream
  GET    /api/streams           - List active streams
  POST   /api/playlist/create   - Create a concat file
  GET    /api/playlists         - List concat files

HLS Endpoints:
  GET    /stream/:streamId/stream.m3u8  - HLS master playlist
  GET    /stream/:streamId/*.ts         - HLS segments

Player:
  GET    /player.html           - Web player interface

Example:
  curl -X POST http://localhost:${port}/api/stream/start \\
    -H "Content-Type: application/json" \\
    -d '{"streamId":"test","files":["/path/to/video.mp4"]}'
      `);

      resolve({
        server,
        ffmpeg,
        playlist,
        cleanup: async () => {
          await ffmpeg.stopAll();
        }
      });
    });
  });
}

module.exports = {
  createServer,
  startServer
};
