#!/usr/bin/env node

/**
 * Downloads FFmpeg binaries for bundling with the executable
 * Supports Windows, Linux, and macOS
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const FFMPEG_VERSIONS = {
  windows: {
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    filename: 'ffmpeg-windows.zip',
    extractedDir: 'ffmpeg-master-latest-win64-gpl',
    binPath: 'bin/ffmpeg.exe'
  },
  linux: {
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    filename: 'ffmpeg-linux.tar.xz',
    extractedDir: 'ffmpeg-master-latest-linux64-gpl',
    binPath: 'bin/ffmpeg'
  },
  darwin: {
    url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    filename: 'ffmpeg-macos.zip',
    extractedDir: '',
    binPath: 'ffmpeg'
  }
};

const DOWNLOAD_DIR = path.join(__dirname, '..', 'ffmpeg-dist');
const BIN_DIR = path.join(__dirname, '..', 'bin');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    console.log(`Destination: ${dest}`);

    const file = fs.createWriteStream(dest);
    let downloadedBytes = 0;

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        console.log('Following redirect...');
        return downloadFile(response.headers.location, dest)
          .then(resolve)
          .catch(reject);
      }

      const totalBytes = parseInt(response.headers['content-length'], 10);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(1)}MB / ${(totalBytes / 1024 / 1024).toFixed(1)}MB)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\nDownload complete!');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function extractArchive(archivePath, platform) {
  console.log(`\nExtracting ${archivePath}...`);

  const extractDir = DOWNLOAD_DIR;

  try {
    if (platform === 'windows' || platform === 'darwin') {
      // Extract ZIP
      if (os.platform() === 'win32') {
        execSync(`powershell -command "Expand-Archive -Force '${archivePath}' '${extractDir}'"`, { stdio: 'inherit' });
      } else {
        execSync(`unzip -o "${archivePath}" -d "${extractDir}"`, { stdio: 'inherit' });
      }
    } else if (platform === 'linux') {
      // Extract TAR.XZ
      execSync(`tar -xf "${archivePath}" -C "${extractDir}"`, { stdio: 'inherit' });
    }
    console.log('Extraction complete!');
  } catch (error) {
    console.error('Extraction failed:', error.message);
    throw error;
  }
}

function copyBinary(platform) {
  console.log('\nCopying FFmpeg binary...');

  const config = FFMPEG_VERSIONS[platform];
  const sourcePath = path.join(DOWNLOAD_DIR, config.extractedDir, config.binPath);
  const destPath = path.join(BIN_DIR, platform === 'windows' ? 'ffmpeg.exe' : 'ffmpeg');

  ensureDir(BIN_DIR);

  if (!fs.existsSync(sourcePath)) {
    console.error(`ERROR: FFmpeg binary not found at ${sourcePath}`);
    console.log('\nAvailable files in download directory:');
    execSync(`ls -la "${DOWNLOAD_DIR}"`, { stdio: 'inherit' });
    throw new Error('FFmpeg binary not found after extraction');
  }

  fs.copyFileSync(sourcePath, destPath);

  // Make executable on Unix systems
  if (platform !== 'windows') {
    fs.chmodSync(destPath, 0o755);
  }

  console.log(`FFmpeg copied to: ${destPath}`);

  // Verify it works (skip if cross-compiling)
  const currentPlatform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
  const isCrossCompiling = currentPlatform !== platform;

  if (isCrossCompiling) {
    console.log('\n⚠️  Cross-compiling detected - skipping FFmpeg verification');
    console.log(`   Building ${platform} binary on ${currentPlatform}`);
    console.log('   FFmpeg will be verified when you run the executable on the target platform');
  } else {
    console.log('\nVerifying FFmpeg...');
    try {
      const version = execSync(`"${destPath}" -version`, { encoding: 'utf8' });
      console.log('FFmpeg version:', version.split('\n')[0]);

      // Check for GPU support
      if (version.includes('--enable-nvenc')) {
        console.log('✅ NVIDIA NVENC support: ENABLED');
      }
      if (version.includes('--enable-cuda')) {
        console.log('✅ CUDA support: ENABLED');
      }
      if (version.includes('--enable-amf')) {
        console.log('✅ AMD AMF support: ENABLED');
      }
      if (version.includes('--enable-qsv') || version.includes('libmfx')) {
        console.log('✅ Intel Quick Sync support: ENABLED');
      }
    } catch (error) {
      console.warn('⚠️  FFmpeg verification failed:', error.message);
      console.log('   This is usually fine - FFmpeg will work on the target platform');
    }
  }
}

function cleanup(platform) {
  console.log('\nCleaning up temporary files...');

  const config = FFMPEG_VERSIONS[platform];
  const archivePath = path.join(DOWNLOAD_DIR, config.filename);
  const extractedPath = path.join(DOWNLOAD_DIR, config.extractedDir);

  try {
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
      console.log(`Removed: ${archivePath}`);
    }

    if (fs.existsSync(extractedPath)) {
      fs.rmSync(extractedPath, { recursive: true, force: true });
      console.log(`Removed: ${extractedPath}`);
    }
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

async function main() {
  const platform = process.argv[2] || process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';

  if (!FFMPEG_VERSIONS[platform]) {
    console.error(`Unsupported platform: ${platform}`);
    console.log('Supported platforms: windows, linux, darwin');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         FFmpeg Download & Bundle Script                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nPlatform: ${platform}`);
  console.log('This will download FFmpeg with GPU support (NVENC, AMF, QSV)\n');

  const config = FFMPEG_VERSIONS[platform];
  const archivePath = path.join(DOWNLOAD_DIR, config.filename);

  try {
    // Create directories
    ensureDir(DOWNLOAD_DIR);
    ensureDir(BIN_DIR);

    // Download FFmpeg
    await downloadFile(config.url, archivePath);

    // Extract archive
    extractArchive(archivePath, platform);

    // Copy binary to bin directory
    copyBinary(platform);

    // Cleanup temporary files
    cleanup(platform);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         SUCCESS! FFmpeg is ready for bundling             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\nFFmpeg binary location: ${path.join(BIN_DIR, platform === 'windows' ? 'ffmpeg.exe' : 'ffmpeg')}`);
    console.log('\nYou can now build the executable with:');
    console.log(`  npm run build:${platform}:gui`);
    console.log('\nThe FFmpeg binary will be bundled inside the .exe\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
