# Simple HLS Streamer

A lightweight HLS (HTTP Live Streaming) server that streams video files using FFmpeg concat demuxer.

## Features

- Stream multiple video files as a single continuous HLS stream
- Automatic concat file generation from file lists
- RESTful API for stream control
- Real-time HLS segment serving
- Multiple concurrent streams support
- Graceful shutdown handling
- **NEW**: Windows GUI with system tray icon (no command line needed!)

## Installation Options

### Option 1: Windows GUI (Easiest for Windows Users) 🌟

**100% standalone - no installation needed!**

✅ FFmpeg bundled inside
✅ GPU acceleration (NVIDIA/AMD/Intel)
✅ System tray interface
✅ Auto-opens web player

1. Download `hls-streamer-gui-windows.exe` from releases
2. Double-click and start streaming!

See **[WINDOWS-GUI.md](WINDOWS-GUI.md)** for detailed instructions.
See **[GPU-SUPPORT.md](GPU-SUPPORT.md)** for GPU acceleration info.

### Option 2: From Source (All Platforms)

**Prerequisites:**
- Node.js (v14 or higher)
- FFmpeg installed and available in PATH

**Installation:**
```bash
cd simple-hls-streamer
npm install

# Run CLI version:
npm start

# Or run GUI version (Windows/Linux/macOS):
npm run start:gui
```

### Option 3: Build Your Own Executable

See **[BUILD.md](BUILD.md)** for instructions on building standalone executables for Windows, Linux, or macOS.

## Quick Start

### 1. Start the server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 2. Start a stream

Create a stream with a list of video files:

```bash
curl -X POST http://localhost:3000/api/stream/start \
  -H "Content-Type: application/json" \
  -d '{
    "streamId": "my-stream",
    "files": [
      "/absolute/path/to/video1.mp4",
      "/absolute/path/to/video2.mp4",
      "/absolute/path/to/video3.mp4"
    ]
  }'
```

### 3. Access the stream

Open in a video player that supports HLS (VLC, ffplay, web browser with hls.js):

```
http://localhost:3000/stream/my-stream/stream.m3u8
```

## API Reference

### Start Stream

**POST** `/api/stream/start`

Start a new HLS stream from a list of files.

**Request Body:**
```json
{
  "streamId": "my-stream",
  "files": [
    "/path/to/video1.mp4",
    "/path/to/video2.mp4"
  ],
  "options": {
    "segmentDuration": 6,
    "videoBitrate": "1500k",
    "audioBitrate": "128k",
    "resolution": "1920x1080",
    "fps": 30,
    "preset": "veryfast"
  }
}
```

**Response:**
```json
{
  "success": true,
  "stream": {
    "streamId": "my-stream",
    "m3u8Path": "/stream/my-stream/stream.m3u8",
    "outputDir": "/path/to/output/my-stream"
  },
  "validation": {
    "total": 2,
    "existing": 2,
    "missing": []
  }
}
```

### Stop Stream

**POST** `/api/stream/stop`

Stop an active stream.

**Request Body:**
```json
{
  "streamId": "my-stream"
}
```

### List Streams

**GET** `/api/streams`

Get all active streams.

**Response:**
```json
{
  "count": 1,
  "streams": [
    {
      "streamId": "my-stream",
      "outputDir": "/path/to/output/my-stream",
      "uptime": 45000
    }
  ]
}
```

### Create Playlist (Concat File)

**POST** `/api/playlist/create`

Create a concat file without starting a stream.

**Request Body:**
```json
{
  "playlistId": "my-playlist",
  "files": [
    "/path/to/video1.mp4",
    "/path/to/video2.mp4"
  ]
}
```

### List Playlists

**GET** `/api/playlists`

List all concat files.

## Stream Options

| Option | Default | Description |
|--------|---------|-------------|
| `segmentDuration` | `6` | Duration of each HLS segment in seconds |
| `videoBitrate` | `"1500k"` | Video bitrate |
| `audioBitrate` | `"128k"` | Audio bitrate |
| `resolution` | `"1920x1080"` | Output resolution (width x height) |
| `fps` | `30` | Frames per second |
| `preset` | `"veryfast"` | FFmpeg encoding preset (ultrafast, veryfast, fast, medium, slow) |

## HLS Endpoints

- **Master Playlist**: `GET /stream/:streamId/stream.m3u8`
- **Segments**: `GET /stream/:streamId/stream_XXX.ts`

## Example Usage with curl

```bash
# Start a stream
curl -X POST http://localhost:3000/api/stream/start \
  -H "Content-Type: application/json" \
  -d '{
    "streamId": "test",
    "files": ["/path/to/movie1.mp4", "/path/to/movie2.mp4"]
  }'

# Check active streams
curl http://localhost:3000/api/streams

# Play with ffplay
ffplay http://localhost:3000/stream/test/stream.m3u8

# Stop the stream
curl -X POST http://localhost:3000/api/stream/stop \
  -H "Content-Type: application/json" \
  -d '{"streamId": "test"}'
```

## Example Usage with Node.js

```javascript
const axios = require('axios');

async function startStream() {
  const response = await axios.post('http://localhost:3000/api/stream/start', {
    streamId: 'my-channel',
    files: [
      '/path/to/episode1.mp4',
      '/path/to/episode2.mp4',
      '/path/to/episode3.mp4'
    ],
    options: {
      videoBitrate: '2500k',
      resolution: '1920x1080'
    }
  });

  console.log('Stream started:', response.data);
  console.log('Watch at:', `http://localhost:3000${response.data.stream.m3u8Path}`);
}

startStream();
```

## Directory Structure

```
simple-hls-streamer/
├── src/
│   ├── index.js       # Main Express server
│   ├── ffmpeg.js      # FFmpeg streaming logic
│   └── playlist.js    # Concat file management
├── output/            # HLS output (segments and m3u8)
├── playlists/         # Concat files
├── package.json
└── README.md
```

## How It Works

1. **File List** → You provide an array of video file paths
2. **Concat File** → A `concat.txt` file is generated in FFmpeg format
3. **FFmpeg** → Streams files using `-f concat` and outputs HLS segments
4. **Express** → Serves the `.m3u8` playlist and `.ts` segments via HTTP
5. **Client** → Video player requests segments and plays the stream

## Troubleshooting

### Stream not starting

- Check that FFmpeg is installed: `ffmpeg -version`
- Verify all file paths are absolute and exist
- Check server logs for FFmpeg errors

### Segments not appearing

- Wait 5-10 seconds for initial segments to generate
- Check the `output/:streamId/` directory for `.ts` files
- Ensure FFmpeg has write permissions to output directory

### Stream buffering or stuttering

- Increase `segmentDuration` (e.g., 10 seconds)
- Lower `videoBitrate` for slower connections
- Use a faster FFmpeg preset (e.g., `ultrafast`)

## Development

Run with auto-reload:

```bash
npm run dev
```

## License

GNU General Public License v2.0 or later

This project uses FFmpeg with GPL components enabled, which requires the entire application to be licensed under GPL. See LICENSE file for details.
