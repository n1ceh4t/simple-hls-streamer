@echo off
echo.
echo ========================================
echo   Simple HLS Streamer - Starting...
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install --no-bin-links
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if FFmpeg is available
where ffmpeg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] FFmpeg not found in PATH!
    echo Streaming will fail unless FFmpeg is installed.
    echo Install from: https://www.gyan.dev/ffmpeg/builds/
    echo.
)

REM Start the server
echo [INFO] Starting Simple HLS Streamer...
echo.
node src\index.js

REM If node exits, pause so user can see error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server exited with error code %ERRORLEVEL%
    pause
)
