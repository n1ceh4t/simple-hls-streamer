@echo off
echo ====================================================================
echo Simple HLS Streamer - FFmpeg Installation Helper
echo ====================================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Not running as Administrator.
    echo Some installation methods require administrator privileges.
    echo.
)

REM Check if ffmpeg is already installed
where ffmpeg >nul 2>&1
if %errorLevel% equ 0 (
    echo FFmpeg is already installed!
    echo.
    ffmpeg -version | findstr "ffmpeg version"
    echo.
    echo You're all set! You can close this window.
    pause
    exit /b 0
)

echo FFmpeg is NOT currently installed.
echo.
echo Please choose an installation method:
echo.
echo [1] Install via Chocolatey (RECOMMENDED - easiest)
echo [2] Install via winget (Windows Package Manager)
echo [3] Download manually (opens browser)
echo [4] Cancel
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto chocolatey
if "%choice%"=="2" goto winget
if "%choice%"=="3" goto manual
if "%choice%"=="4" goto cancel

echo Invalid choice. Exiting.
pause
exit /b 1

:chocolatey
echo.
echo Checking if Chocolatey is installed...
where choco >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo Chocolatey is not installed.
    echo.
    echo To install Chocolatey:
    echo 1. Open PowerShell as Administrator
    echo 2. Run this command:
    echo    Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    echo.
    echo Or visit: https://chocolatey.org/install
    echo.
    pause
    exit /b 1
)

echo Chocolatey found! Installing FFmpeg...
echo.
choco install ffmpeg -y

if %errorLevel% equ 0 (
    echo.
    echo ====================================================================
    echo FFmpeg installed successfully!
    echo ====================================================================
    echo.
    echo Please CLOSE AND REOPEN this command prompt window to use FFmpeg.
    echo Then you can run hls-streamer-gui-windows.exe
    echo.
) else (
    echo.
    echo Installation failed. Please try manual installation.
    echo.
)
pause
exit /b 0

:winget
echo.
echo Installing FFmpeg via winget...
echo.
winget install ffmpeg

if %errorLevel% equ 0 (
    echo.
    echo ====================================================================
    echo FFmpeg installed successfully!
    echo ====================================================================
    echo.
    echo Please CLOSE AND REOPEN this command prompt window to use FFmpeg.
    echo Then you can run hls-streamer-gui-windows.exe
    echo.
) else (
    echo.
    echo Installation failed. Please try manual installation.
    echo.
)
pause
exit /b 0

:manual
echo.
echo Opening FFmpeg download page in your browser...
echo.
echo Download instructions:
echo 1. Download "ffmpeg-release-essentials.zip" from the opened page
echo 2. Extract the ZIP file to a folder (e.g., C:\ffmpeg)
echo 3. Add the "bin" folder to your PATH environment variable
echo    Example: Add C:\ffmpeg\bin to PATH
echo.
echo For detailed instructions, see WINDOWS.md in the application folder.
echo.

start https://www.gyan.dev/ffmpeg/builds/

pause
exit /b 0

:cancel
echo.
echo Installation cancelled.
echo.
echo You will need FFmpeg to use Simple HLS Streamer.
echo Run this script again when you're ready to install.
echo.
pause
exit /b 0
