# Simple HLS Streamer - Usage Guide

## Quick Start (Windows Users)

### Step 1: Download
Download `hls-streamer-windows.exe` from the releases page.

### Step 2: Place with Your Videos
Copy the .exe into a folder with your video files:

```
MyVideos/
├── hls-streamer-windows.exe
├── episode1.mp4
├── episode2.mp4
└── episode3.mp4
```

### Step 3: Run
Double-click `hls-streamer-windows.exe`

**That's it!** The program will:
- ✅ Automatically find all video files
- ✅ Create a playlist (sorted alphabetically)
- ✅ Start streaming with GPU acceleration
- ✅ Open your browser to watch!

---

## What Happens When You Run It

### If Video Files Are Found:

```
╔════════════════════════════════════════════════════════════╗
║         Simple HLS Streamer - Windows Edition             ║
╚════════════════════════════════════════════════════════════╝

Scanning current directory for video files...
Directory: C:\MyVideos

[MediaScanner] ✅ Found 3 video file(s)
[MediaScanner] Total size: 2.5 GB

Playlist:
─────────────────────────────────────────────────────────────
  01. episode1.mp4 (850 MB)
  02. episode2.mp4 (920 MB)
  03. episode3.mp4 (750 MB)
─────────────────────────────────────────────────────────────

Starting HLS streaming server...

✅ Server started successfully!

📡 Server URL: http://localhost:3000

Starting stream with found videos...

✅ Stream started successfully!

🎬 Stream URL: http://localhost:3000/stream/auto-stream/stream.m3u8
🌐 Web Player: http://localhost:3000/player.html

Opening web player...

Server is running. To stop:
  • Press Ctrl+C in this window
  • Or close this window
```

Your browser will open and start playing the videos!

### If No Video Files Are Found:

```
⚠️  No video files found!

To use this program:
  1. Copy your video files to this directory
  2. Run this program again

Creating example configuration...

📄 Created example files:
   - example-playlist.json
   - HOW-TO-USE.txt
```

The program creates helpful guide files and still starts the server so you can use the web interface manually.

---

## Supported Video Formats

- `.mp4` - MPEG-4 Video (recommended)
- `.mkv` - Matroska Video
- `.avi` - Audio Video Interleave
- `.mov` - QuickTime Movie
- `.wmv` - Windows Media Video
- `.flv` - Flash Video
- `.webm` - WebM Video
- `.m4v` - MPEG-4 Video
- `.mpg`, `.mpeg` - MPEG Video
- `.3gp` - 3GPP Multimedia
- `.ts`, `.mts`, `.m2ts` - MPEG Transport Stream

---

## Advanced Usage

### Manual Playlist (playlist.json)

If you want to specify exact files or use files from different locations, create a `playlist.json` file:

```json
{
  "streamId": "auto-stream",
  "files": [
    "C:\\Videos\\movie1.mp4",
    "D:\\Downloads\\movie2.mp4",
    "C:\\Users\\You\\Desktop\\movie3.mkv"
  ],
  "options": {
    "segmentDuration": 6,
    "videoBitrate": "2000k",
    "audioBitrate": "128k",
    "resolution": "1920x1080",
    "fps": 30,
    "useGPU": true
  }
}
```

Place `playlist.json` in the same folder as the .exe and run it. The program will use your manual configuration instead of auto-scanning.

### Change Port

Set the PORT environment variable:

```cmd
set PORT=8080
hls-streamer-windows.exe
```

### Disable GPU

Edit `playlist.json` and set `"useGPU": false`

Or force CPU encoding:
```cmd
set USE_GPU=false
hls-streamer-windows.exe
```

### Custom FFmpeg Path

If you want to use a different FFmpeg:

```cmd
set FFMPEG_PATH=C:\custom\ffmpeg.exe
hls-streamer-windows.exe
```

---

## Features

### ✅ Automatic Media Scanning
- Finds all video files in current directory
- Sorts alphabetically for predictable playback order
- Shows file names and sizes

### ✅ GPU Hardware Acceleration
- Automatically detects NVIDIA, AMD, or Intel GPUs
- 5-10x faster encoding than CPU
- Much lower CPU usage
- Falls back to CPU if no GPU found

### ✅ Zero Configuration
- No FFmpeg installation needed (bundled inside)
- No Node.js installation needed
- No configuration files required
- Just drop in a folder and run!

### ✅ Multiple Video Support
- Plays multiple videos as one continuous stream
- Seamless transitions between videos
- HLS streaming for smooth playback

### ✅ Web Player Included
- Opens automatically in your browser
- Modern, responsive interface
- Compatible with all modern browsers

---

## Console Window Controls

### While Running:
- **Ctrl+C** - Gracefully stop the server
- **Close Window** - Force stop (not recommended)

### Tips:
- Keep the console window open while streaming
- Don't minimize or hide it - it shows important status info
- If you close it by accident, just run the .exe again

---

## Troubleshooting

### "No video files found"
- Make sure your video files are in the same folder as the .exe
- Check that files have supported extensions (.mp4, .mkv, etc.)
- The .exe must be in the SAME folder as your videos

### "Port 3000 already in use"
- Another program is using port 3000
- Set a different port: `set PORT=8080` then run the .exe
- Or close the other program

### Browser doesn't open
- Manually open: http://localhost:3000/player.html
- Check Windows Firewall isn't blocking it
- Try a different browser

### Stream won't start / "Failed to start stream"
- Check FFmpeg output in the console
- Verify video files aren't corrupted
- Try with just one video file first
- Make sure videos aren't DRM-protected

### Videos skip or stutter
- Your GPU might be at capacity
- Try disabling GPU: create playlist.json with `"useGPU": false`
- Reduce bitrate: `"videoBitrate": "1000k"`
- Check your CPU/GPU usage in Task Manager

### "Access Denied" or permission errors
- Run the .exe as Administrator (right-click → Run as administrator)
- Make sure the folder isn't read-only
- Check antivirus isn't blocking it

---

## File Organization Tips

### Good Structure:
```
Shows/
├── Show1/
│   ├── hls-streamer-windows.exe
│   ├── S01E01.mp4
│   ├── S01E02.mp4
│   └── S01E03.mp4
└── Show2/
    ├── hls-streamer-windows.exe
    ├── episode1.mp4
    └── episode2.mp4
```

Each show gets its own copy of the .exe in its folder.

### File Naming for Correct Order:
```
Good (plays in order):
  - 01-intro.mp4
  - 02-main.mp4
  - 03-outro.mp4

Bad (unpredictable order):
  - intro.mp4
  - main.mp4
  - outro.mp4
```

Use numbers at the start for guaranteed alphabetical sorting!

---

## Performance Tips

### For Best Quality:
```json
{
  "options": {
    "videoBitrate": "4000k",
    "audioBitrate": "192k",
    "resolution": "1920x1080",
    "useGPU": true
  }
}
```

### For Fast Encoding (Lower Quality):
```json
{
  "options": {
    "videoBitrate": "1000k",
    "audioBitrate": "96k",
    "resolution": "1280x720",
    "useGPU": true
  }
}
```

### For 4K Content:
```json
{
  "options": {
    "videoBitrate": "8000k",
    "audioBitrate": "256k",
    "resolution": "3840x2160",
    "useGPU": true
  }
}
```

---

## Security Notes

- No external access without port forwarding
- Only scans the current working directory

---

## Building from Source

If you want to build the .exe yourself:

```bash
# Clone the repository
git clone https://github.com/yourusername/simple-hls-streamer
cd simple-hls-streamer

# Install dependencies
npm install

# Download FFmpeg
npm run download-ffmpeg:windows

# Build Windows executable
npm run build:windows

# Output: dist/hls-streamer-windows.exe
```

---

## What's Different from Other Streaming Solutions?

| Feature | This Tool | Plex | Jellyfin | VLC |
|---------|-----------|------|----------|-----|
| Installation | ✅ None (portable .exe) | ❌ Installer required | ❌ Installer required | ✅ Portable available |
| Configuration | ✅ Zero (auto-scans) | ❌ Complex setup | ❌ Complex setup | ⚠️ Manual |
| GPU Support | ✅ Auto-detected | ✅ Yes | ✅ Yes | ⚠️ Manual config |
| Multiple Videos | ✅ Continuous stream | ✅ Playlist | ✅ Playlist | ✅ Playlist |
| Web Interface | ✅ Built-in | ✅ Full-featured | ✅ Full-featured | ❌ No |
| HLS Streaming | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Limited |
| File Size | ✅ 232MB | ❌ 200MB+ | ❌ 300MB+ | ⚠️ 100MB+ |

**This tool is perfect for:**
- Quick video streaming without setup
- Testing HLS streams
- Temporary video playback
- Learning about HLS streaming
- Portable streaming solution

**Use Plex/Jellyfin instead for:**
- Permanent media library management
- Multiple users
- Remote access
- Advanced features (subtitles, metadata, etc.)

---

## License

MIT License - Free to use, modify, and distribute.

FFmpeg is licensed under LGPL/GPL. This project uses FFmpeg as a bundled binary (no modifications), complying with LGPL requirements.

---

**Enjoy your HLS streaming! 🎬**
