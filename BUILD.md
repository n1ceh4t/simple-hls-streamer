# Building Simple HLS Streamer

This guide explains how to build standalone executables for Windows and other platforms.

## Quick Start (Windows Users)

If you just want to **use** the pre-built Windows executable:

1. Download `hls-streamer-gui-windows.exe` from the releases page
2. Right-click `hls-streamer-gui-windows.exe` and run as administrator

That's it! No Node.js installation required.

---

## Building from Source

### Prerequisites

1. **Node.js** (v14 or higher)
   - Download from https://nodejs.org/

2. **npm** (comes with Node.js)

3. **FFmpeg** (required to run the built executable)
   - Windows: `choco install ffmpeg`
   - Linux: `sudo apt install ffmpeg`
   - macOS: `brew install ffmpeg`

### Installation

```bash
# Clone or download the repository
cd simple-hls-streamer

# Install dependencies
npm install

# Or on Windows with symlink issues:
npm run install:safe
```

### Build Commands

#### Build Windows GUI Executable (Recommended)
```bash
npm run build:windows:gui
```
**Output**: `dist/hls-streamer-gui-windows.exe` (~60MB)

Features:
- System tray icon
- Start/stop server from tray menu
- Auto-opens web player
- No console window
- Single-click operation

#### Build Windows CLI Executable
```bash
npm run build:windows
```
**Output**: `dist/hls-streamer-windows.exe` (~50MB)

Features:
- Command-line interface
- Runs as a service
- Smaller file size

#### Build All Platforms
```bash
npm run build:all
```

Outputs:
- `dist/hls-streamer-gui-windows.exe` - Windows GUI version
- `dist/hls-streamer-windows.exe` - Windows CLI version
- `dist/hls-streamer-linux` - Linux CLI version
- `dist/hls-streamer-macos` - macOS CLI version

### Build Targets

The default configuration targets:
- **OS**: Windows, Linux, macOS
- **Architecture**: x64
- **Node.js**: v18 (bundled)

To customize, edit the `pkg` section in `package.json`.

---

## Running the Built Executables

### Windows GUI Version
```bash
# Just double-click the .exe file, or run from command line:
hls-streamer-gui-windows.exe

# The system tray icon will appear in your taskbar
# Right-click it to:
#   - Start Server
#   - Stop Server
#   - Open Player (in web browser)
#   - Open API Docs
#   - Exit
```

### Windows CLI Version
```bash
# Run from command line:
hls-streamer-windows.exe

# Or with custom port:
set PORT=8080
hls-streamer-windows.exe
```

### Linux/macOS
```bash
# Make executable (first time only):
chmod +x hls-streamer-linux

# Run:
./hls-streamer-linux

# Or with custom port:
PORT=8080 ./hls-streamer-linux
```

---

## FFmpeg Requirement

**IMPORTANT**: The built executables do NOT include FFmpeg. You must install it separately.

### Why isn't FFmpeg bundled?

1. **License compliance** - FFmpeg has complex licensing (GPL/LGPL)
2. **File size** - FFmpeg is ~100MB, would make the .exe 200MB+
3. **Updates** - Users can update FFmpeg independently
4. **Flexibility** - Users can use custom FFmpeg builds

### Installing FFmpeg

#### Windows
```powershell
# Option 1: Chocolatey (easiest)
choco install ffmpeg

# Option 2: Manual
# 1. Download from https://www.gyan.dev/ffmpeg/builds/
# 2. Extract to C:\ffmpeg
# 3. Add C:\ffmpeg\bin to PATH
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# Fedora
sudo dnf install ffmpeg

# Arch
sudo pacman -S ffmpeg
```

#### macOS
```bash
# Homebrew
brew install ffmpeg

# MacPorts
sudo port install ffmpeg
```

### Custom FFmpeg Path

If FFmpeg is not in your PATH, set the `FFMPEG_PATH` environment variable:

**Windows:**
```cmd
set FFMPEG_PATH=C:\path\to\ffmpeg.exe
hls-streamer-gui-windows.exe
```

**Linux/macOS:**
```bash
export FFMPEG_PATH=/path/to/ffmpeg
./hls-streamer-linux
```

---

## File Structure

After building, you'll have:

```
simple-hls-streamer/
├── dist/
│   ├── hls-streamer-gui-windows.exe    (~60MB, GUI version)
│   ├── hls-streamer-windows.exe        (~50MB, CLI version)
│   ├── hls-streamer-linux              (~50MB)
│   └── hls-streamer-macos              (~50MB)
├── src/                                 (source code)
├── player.html                          (web player UI)
└── package.json
```

### What Gets Bundled?

The executable includes:
- Node.js runtime (v18)
- All npm dependencies (Express, CORS, systray2, etc.)
- Your source code (src/)
- Static assets (player.html)

**NOT included**:
- FFmpeg (must be installed separately)
- Video files (you provide these)
- Configuration files (created at runtime)

---

## Distribution

### For End Users (Windows)

Create a release package:

```
hls-streamer-release/
├── hls-streamer-gui-windows.exe
├── README.txt                    (Quick start instructions)
└── install-ffmpeg.bat            (Optional FFmpeg installer)
```

**README.txt** should contain:
```
Simple HLS Streamer - Quick Start
==================================

1. Install FFmpeg (if not already installed):
   - Run: choco install ffmpeg
   - Or download from: https://www.gyan.dev/ffmpeg/builds/

2. Double-click hls-streamer-gui-windows.exe

3. Look for the icon in your system tray (bottom-right corner)

4. Right-click the icon and select "Start Server"

5. The web player will open automatically in your browser

That's it! Enjoy streaming!
```

### Creating an Installer (Optional)

For a professional installer, use:

1. **NSIS** (Nullsoft Scriptable Install System)
   - Free, open-source
   - Creates small .exe installers
   - Can bundle FFmpeg

2. **Inno Setup**
   - Free, easy to use
   - Professional-looking installers

3. **Advanced Installer**
   - Commercial (has free tier)
   - Very powerful, MSI support

---

## Troubleshooting

### "pkg: not found" error
```bash
# Install pkg globally:
npm install -g pkg

# Or use npx:
npx pkg . --targets node18-win-x64 --output dist/hls-streamer-windows.exe
```

### Build fails with "Cannot find module"
```bash
# Clean install:
rm -rf node_modules package-lock.json
npm install
npm run build:windows:gui
```

### Executable won't run
```bash
# Check Node.js version (should be v14+):
node --version

# Rebuild:
npm run build:windows:gui
```

### Windows Defender blocks executable
This is normal for unsigned executables. Options:
1. Code-sign the executable (requires certificate ~$200/year)
2. Tell users to click "More info" → "Run anyway"
3. Submit to Microsoft for analysis (free, takes ~3 days)

### System tray icon doesn't appear
- Check Task Manager for running process
- Try restarting the executable
- Check Windows notification settings

---

## Advanced Configuration

### Custom Port
```bash
# Windows
set PORT=8080
hls-streamer-gui-windows.exe

# Linux/macOS
PORT=8080 ./hls-streamer-linux
```

### Custom FFmpeg Path
```bash
# Windows
set FFMPEG_PATH=C:\custom\path\ffmpeg.exe
hls-streamer-gui-windows.exe

# Linux/macOS
FFMPEG_PATH=/custom/path/ffmpeg ./hls-streamer-linux
```

### Running as Windows Service

Use NSSM (Non-Sucking Service Manager):
```powershell
# Install NSSM
choco install nssm

# Install service
nssm install HLSStreamer "C:\path\to\hls-streamer-windows.exe"

# Start service
nssm start HLSStreamer

# Stop service
nssm stop HLSStreamer
```

---

## Size Optimization

Current build sizes:
- GUI version: ~60MB (includes systray2 native modules)
- CLI version: ~50MB

To reduce size:
1. Remove unused dependencies
2. Use UPX compression (not recommended, may trigger antivirus)
3. Target specific Node version (we use node18)

---

## Support

- **Issues**: https://github.com/yourusername/simple-hls-streamer/issues
- **Documentation**: See README.md and WINDOWS.md
- **FFmpeg Help**: https://ffmpeg.org/documentation.html

---

## License

GNU General Public License v2.0 or later - See LICENSE file for details.

This project uses FFmpeg with GPL components enabled, which requires the entire application to be licensed under GPL. When distributing this software, you must provide the complete source code for both this application and FFmpeg, in compliance with GPL requirements.
