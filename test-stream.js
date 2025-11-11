#!/usr/bin/env node

/**
 * Test script for Simple HLS Streamer
 *
 * Usage:
 *   node test-stream.js start <file1> <file2> ...
 *   node test-stream.js stop
 *   node test-stream.js list
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';
const STREAM_ID = 'test-stream';

async function startStream(files) {
  try {
    console.log(`Starting stream with ${files.length} files...`);

    const response = await axios.post(`${API_URL}/api/stream/start`, {
      streamId: STREAM_ID,
      files: files,
      options: {
        segmentDuration: 6,
        videoBitrate: '1500k',
        audioBitrate: '128k',
        resolution: '1920x1080',
        fps: 30
      }
    });

    console.log('\n✅ Stream started successfully!\n');
    console.log('Stream Info:', JSON.stringify(response.data, null, 2));
    console.log(`\n📺 Watch at: ${API_URL}${response.data.stream.m3u8Path}`);
    console.log(`\nPlay with ffplay:\n  ffplay ${API_URL}${response.data.stream.m3u8Path}\n`);

  } catch (error) {
    console.error('❌ Error starting stream:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function stopStream() {
  try {
    console.log('Stopping stream...');

    const response = await axios.post(`${API_URL}/api/stream/stop`, {
      streamId: STREAM_ID
    });

    console.log('✅ Stream stopped:', response.data.message);

  } catch (error) {
    console.error('❌ Error stopping stream:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function listStreams() {
  try {
    const response = await axios.get(`${API_URL}/api/streams`);

    console.log(`\nActive Streams: ${response.data.count}\n`);

    if (response.data.streams.length === 0) {
      console.log('No active streams');
    } else {
      response.data.streams.forEach(stream => {
        console.log(`- ${stream.streamId}`);
        console.log(`  Uptime: ${Math.floor(stream.uptime / 1000)}s`);
        console.log(`  Output: ${stream.outputDir}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error listing streams:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function checkHealth() {
  try {
    const response = await axios.get(API_URL);
    console.log('Server Status:', response.data);
  } catch (error) {
    console.error('❌ Server not responding. Is it running?');
    console.error('   Start with: npm start');
    process.exit(1);
  }
}

// Main
async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log(`
Simple HLS Streamer - Test Script

Usage:
  node test-stream.js start <file1> <file2> ...   Start a stream
  node test-stream.js stop                        Stop the stream
  node test-stream.js list                        List active streams
  node test-stream.js health                      Check server status

Examples:
  node test-stream.js start /path/to/video1.mp4 /path/to/video2.mp4
  node test-stream.js list
  node test-stream.js stop
    `);
    process.exit(0);
  }

  // Check server health first
  if (command !== 'health') {
    await checkHealth();
  }

  switch (command) {
    case 'start':
      const files = process.argv.slice(3);
      if (files.length === 0) {
        console.error('❌ Error: No files provided');
        console.log('Usage: node test-stream.js start <file1> <file2> ...');
        process.exit(1);
      }
      await startStream(files);
      break;

    case 'stop':
      await stopStream();
      break;

    case 'list':
      await listStreams();
      break;

    case 'health':
      await checkHealth();
      console.log('✅ Server is running');
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Valid commands: start, stop, list, health');
      process.exit(1);
  }
}

main();
