# Quick Start Guide

## Installation

1. **Copy this folder to your home directory or a writable location:**
   ```bash
   cp -r simple-hls-streamer ~/simple-hls-streamer
   cd ~/simple-hls-streamer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify FFmpeg is installed:**
   ```bash
   ffmpeg -version
   ```

## Running Your First Stream

### Step 1: Start the server

```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║         Simple HLS Streamer                                ║
║         Server running on http://localhost:3000           ║
╚════════════════════════════════════════════════════════════╝
```

### Step 2: Start a stream (using test script)

In a new terminal:

```bash
node test-stream.js start /path/to/video1.mp4 /path/to/video2.mp4
```

Replace with actual paths to your video files. Example:
```bash
node test-stream.js start \
  ~/Videos/movie1.mp4 \
  ~/Videos/movie2.mp4 \
  ~/Videos/movie3.mp4
```

### Step 3: Watch the stream

**Option 1: Browser** (recommended for testing)

Open `player.html` in your browser, then click "Load Stream"

**Option 2: VLC**

```bash
vlc http://localhost:3000/stream/test-stream/stream.m3u8
```

**Option 3: ffplay**

```bash
ffplay http://localhost:3000/stream/test-stream/stream.m3u8
```

## Using the API Directly

### Start a stream with curl

```bash
curl -X POST http://localhost:3000/api/stream/start \
  -H "Content-Type: application/json" \
  -d '{
    "streamId": "my-channel",
    "files": [
      "/absolute/path/to/video1.mp4",
      "/absolute/path/to/video2.mp4"
    ],
    "options": {
      "videoBitrate": "2000k",
      "resolution": "1920x1080"
    }
  }'
```

### Check active streams

```bash
curl http://localhost:3000/api/streams
```

### Stop a stream

```bash
curl -X POST http://localhost:3000/api/stream/stop \
  -H "Content-Type: application/json" \
  -d '{"streamId": "my-channel"}'
```

## Troubleshooting

### "Command not found: ffmpeg"

Install FFmpeg:

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### "EPERM: operation not permitted" during npm install

You're likely on a filesystem that doesn't support symlinks. Copy the project to your home directory:
```bash
cp -r simple-hls-streamer ~/simple-hls-streamer
cd ~/simple-hls-streamer
npm install
```

### Stream not playing

1. Wait 5-10 seconds for segments to generate
2. Check server logs for FFmpeg errors
3. Verify file paths are absolute (not relative)
4. Ensure FFmpeg can read the video files

### "Stream not found"

Make sure you're using the correct stream ID and the stream has started successfully. Check active streams:
```bash
node test-stream.js list
```

## Advanced Usage

### Custom video settings

```bash
curl -X POST http://localhost:3000/api/stream/start \
  -H "Content-Type: application/json" \
  -d '{
    "streamId": "hd-stream",
    "files": ["/path/to/video.mp4"],
    "options": {
      "segmentDuration": 10,
      "videoBitrate": "5000k",
      "audioBitrate": "192k",
      "resolution": "1920x1080",
      "fps": 60,
      "preset": "medium"
    }
  }'
```

### Multiple concurrent streams

Start different streams with different IDs:

```bash
# Stream 1
curl -X POST http://localhost:3000/api/stream/start \
  -d '{"streamId":"channel1","files":["/path/to/movies/..."]}'

# Stream 2
curl -X POST http://localhost:3000/api/stream/start \
  -d '{"streamId":"channel2","files":["/path/to/shows/..."]}'
```

Access them at:
- `http://localhost:3000/stream/channel1/stream.m3u8`
- `http://localhost:3000/stream/channel2/stream.m3u8`

## Next Steps

- See [README.md](README.md) for complete API documentation
- Edit `src/index.js` to customize the server
- Modify `src/ffmpeg.js` to change encoding settings
- Open `player.html` for a web-based player

Enjoy streaming! 🎥
