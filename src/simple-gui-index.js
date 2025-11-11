const { startServer } = require('./server');
const open = require('open');
const MediaScanner = require('./media-scanner');
const fs = require('fs').promises;
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         Simple HLS Streamer - Windows Edition             ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

const PORT = process.env.PORT || 3000;
const STREAM_ID = 'auto-stream';

async function createExampleConfig() {
  const exampleFiles = [
    'C:\\Videos\\episode1.mp4',
    'C:\\Videos\\episode2.mp4',
    'C:\\Videos\\episode3.mp4'
  ];

  const configPath = path.join(process.cwd(), 'example-playlist.json');
  const readmePath = path.join(process.cwd(), 'HOW-TO-USE.txt');

  const config = {
    streamId: STREAM_ID,
    files: exampleFiles,
    options: {
      segmentDuration: 6,
      videoBitrate: '1500k',
      audioBitrate: '128k',
      resolution: '1920x1080',
      fps: 30,
      useGPU: true
    }
  };

  const readme = `Simple HLS Streamer - Quick Start Guide
=====================================

No video files were found in the current directory!

HOW TO USE:
-----------

1. Put your video files in this folder:
   ${process.cwd()}

2. Supported formats:
   .mp4, .mkv, .avi, .mov, .wmv, .flv, .webm, .m4v, .mpg, .mpeg, .3gp, .ts, .mts, .m2ts

3. Run this program again:
   ${path.basename(process.execPath)}

The program will automatically:
  ✅ Find all video files
  ✅ Create a playlist (sorted by name)
  ✅ Start streaming them
  ✅ Open your browser to watch!

EXAMPLE:
--------
Place these files in this folder:
  - video1.mp4
  - video2.mp4
  - video3.mp4

Then run the program!

ADVANCED:
---------
If you want to manually specify files, create a "playlist.json" file:

${JSON.stringify(config, null, 2)}

Then place playlist.json in this folder and run the program.

FEATURES:
---------
✅ Automatic GPU acceleration (NVIDIA/AMD/Intel)
✅ FFmpeg bundled inside - no installation needed
✅ Plays multiple videos as one continuous stream
✅ HLS streaming - compatible with all modern browsers

Need help? Check the documentation or open an issue on GitHub.
`;

  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    await fs.writeFile(readmePath, readme);

    console.log('📄 Created example files:');
    console.log(`   - ${configPath}`);
    console.log(`   - ${readmePath}`);
    console.log('');
  } catch (error) {
    console.warn('⚠️  Could not create example files:', error.message);
  }
}

async function startAutoStream(serverUrl, files, ffmpeg, playlist) {
  console.log('');
  console.log('Starting stream with found videos...');
  console.log('');

  try {
    const PlaylistManager = playlist.constructor;
    const filePaths = files.map(f => f.path);

    // Validate files
    const validation = await playlist.validateFiles(filePaths);
    if (validation.missing.length > 0) {
      console.warn(`⚠️  ${validation.missing.length} files are missing or inaccessible`);
    }

    // Create concat file
    const concatFilePath = await playlist.createConcatFile(STREAM_ID, filePaths);

    // Start FFmpeg stream - use current directory, not snapshot path
    const outputDir = path.join(process.cwd(), 'output', STREAM_ID);
    console.log('[Stream] Output directory:', outputDir);
    const streamInfo = await ffmpeg.startStream(STREAM_ID, concatFilePath, outputDir, {
      useGPU: true,
      videoBitrate: '2000k',
      audioBitrate: '128k'
    });

    console.log('✅ Stream started successfully!');
    console.log('');
    console.log(`🎬 Stream URL: ${serverUrl}/stream/${STREAM_ID}/stream.m3u8`);
    console.log(`🌐 Web Player: ${serverUrl}/player.html`);
    console.log('');

    // Auto-open the player
    setTimeout(() => {
      const playerUrl = `${serverUrl}/player.html`;
      console.log('Opening web player...');
      open(playerUrl).catch(err => {
        console.warn('⚠️  Could not auto-open browser:', err.message);
        console.log(`   Please open ${playerUrl} manually`);
      });
    }, 3000);

  } catch (error) {
    console.error('❌ Failed to start stream:', error.message);
    console.error('Full error:', error);
  }
}

async function main() {
  const scanner = new MediaScanner();

  console.log('Scanning current directory for video files...');
  console.log(`Directory: ${process.cwd()}`);
  console.log('');

  // Check for manual playlist.json
  const playlistPath = path.join(process.cwd(), 'playlist.json');
  let manualPlaylist = null;

  try {
    const data = await fs.readFile(playlistPath, 'utf8');
    manualPlaylist = JSON.parse(data);
    console.log('✅ Found playlist.json - using manual configuration');
    console.log('');
  } catch (error) {
    // No manual playlist, will auto-scan
  }

  // Scan for video files
  const playlist = await scanner.createPlaylist(process.cwd(), {
    recursive: false,
    sortBy: 'name'
  });

  scanner.printPlaylist(playlist);

  // Start the server
  console.log('Starting HLS streaming server...');
  console.log('');

  try {
    const { server, ffmpeg, playlist: playlistManager, cleanup } = await startServer(PORT);
    const serverUrl = `http://localhost:${PORT}`;

    console.log('✅ Server started successfully!');
    console.log('');
    console.log(`📡 Server URL: ${serverUrl}`);
    console.log('');

    // Auto-start stream if files were found or manual playlist exists
    if (manualPlaylist) {
      console.log('Using manual playlist configuration...');
      await startAutoStream(serverUrl, manualPlaylist.files.map(f => ({ path: f })), ffmpeg, playlistManager);
    } else if (playlist.count > 0) {
      await startAutoStream(serverUrl, playlist.files, ffmpeg, playlistManager);
    } else {
      // No files found - create example config
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('⚠️  No video files found!');
      console.log('');
      console.log('To use this program:');
      console.log('  1. Copy your video files to this directory');
      console.log('  2. Run this program again');
      console.log('');
      console.log('Creating example configuration...');
      console.log('');

      await createExampleConfig();

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Server is still running. You can:');
      console.log(`  • Open ${serverUrl}/player.html to use the web interface`);
      console.log(`  • Use the API to manually start streams`);
      console.log('');

      // Still open browser to show the web interface
      setTimeout(() => {
        open(`${serverUrl}/player.html`).catch(() => {});
      }, 2000);
    }

    console.log('Server is running. To stop:');
    console.log('  • Press Ctrl+C in this window');
    console.log('  • Or close this window');
    console.log('');

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      await cleanup();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep process alive
    process.stdin.resume();

  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('');
    console.error('Full error:', err);
    console.error('');
    console.error('Press Ctrl+C to exit');
    process.stdin.resume();
  }
}

main();
