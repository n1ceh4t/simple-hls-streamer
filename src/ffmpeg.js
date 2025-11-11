const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');

class FFmpegStreamer {
  constructor() {
    this.activeStreams = new Map();
    this.ffmpegPath = this.findFFmpeg();
    this.gpuInfo = null;
    this.hwEncoders = null;
  }

  /**
   * Find FFmpeg executable (checks bundled version first)
   */
  findFFmpeg() {
    // Check for custom FFMPEG_PATH environment variable
    if (process.env.FFMPEG_PATH) {
      console.log('[FFmpeg] Using custom path from FFMPEG_PATH:', process.env.FFMPEG_PATH);
      return process.env.FFMPEG_PATH;
    }

    const ffmpegName = os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

    // Check if running as pkg executable
    const isPkg = typeof process.pkg !== 'undefined';

    if (isPkg) {
      // When running as pkg executable, extract FFmpeg on first run
      const extractPath = path.join(path.dirname(process.execPath), ffmpegName);

      console.log('[FFmpeg] Running as packaged executable');
      console.log('[FFmpeg] Executable location:', process.execPath);
      console.log('[FFmpeg] FFmpeg target location:', extractPath);

      // Check if already extracted
      if (fsSync.existsSync(extractPath)) {
        console.log('[FFmpeg] ✅ FFmpeg already extracted');
        return extractPath;
      }

      // Extract FFmpeg from pkg snapshot
      console.log('[FFmpeg] FFmpeg not found, extracting from package...');

      try {
        // The bundled FFmpeg is in the snapshot at this path
        const snapshotPath = path.join(__dirname, '..', 'bin', ffmpegName);

        console.log('[FFmpeg] Reading from snapshot:', snapshotPath);

        // Read the file from the pkg snapshot
        const ffmpegData = fsSync.readFileSync(snapshotPath);

        console.log(`[FFmpeg] Read ${(ffmpegData.length / 1024 / 1024).toFixed(2)} MB from snapshot`);
        console.log('[FFmpeg] Writing to:', extractPath);

        // Write to the executable directory
        fsSync.writeFileSync(extractPath, ffmpegData, { mode: 0o755 });

        console.log('[FFmpeg] ✅ FFmpeg extracted successfully!');
        console.log('[FFmpeg] Size:', (ffmpegData.length / 1024 / 1024).toFixed(2), 'MB');

        return extractPath;
      } catch (error) {
        console.error('[FFmpeg] ❌ Failed to extract FFmpeg:', error.message);
        console.error('[FFmpeg] Snapshot path tried:', path.join(__dirname, '..', 'bin', ffmpegName));

        // Try alternative locations
        const altPaths = [
          path.join(process.cwd(), ffmpegName),
          path.join(process.cwd(), 'bin', ffmpegName)
        ];

        for (const altPath of altPaths) {
          if (fsSync.existsSync(altPath)) {
            console.log('[FFmpeg] Found FFmpeg at alternative location:', altPath);
            return altPath;
          }
        }

        throw new Error(`FFmpeg not found in package. Error: ${error.message}`);
      }
    } else {
      // Running from source (not pkg)
      const bundledPaths = [
        path.join(__dirname, '..', 'bin', ffmpegName),
        path.join(process.cwd(), 'bin', ffmpegName)
      ];

      for (const bundledPath of bundledPaths) {
        if (fsSync.existsSync(bundledPath)) {
          console.log('[FFmpeg] Found bundled FFmpeg:', bundledPath);
          return bundledPath;
        }
      }
    }

    // Fall back to system FFmpeg
    console.log('[FFmpeg] Using system FFmpeg from PATH');
    if (os.platform() === 'win32') {
      return 'ffmpeg.exe';
    }

    return 'ffmpeg';
  }

  /**
   * Detect available GPU and hardware encoders
   */
  async detectGPU() {
    if (this.gpuInfo !== null) {
      return this.gpuInfo; // Return cached result
    }

    console.log('[FFmpeg] Detecting GPU capabilities...');

    // Check for environment variable to disable GPU
    if (process.env.NO_GPU === 'true' || process.env.USE_GPU === 'false') {
      console.log('[FFmpeg] GPU disabled via environment variable');
      this.gpuInfo = {
        type: 'CPU',
        encoder: 'libx264',
        hwEncoders: {},
        hwAccelAvailable: false
      };
      return this.gpuInfo;
    }

    try {
      // Get FFmpeg encoders list
      const encoders = execSync(`"${this.ffmpegPath}" -encoders -hide_banner`, {
        encoding: 'utf8',
        timeout: 5000
      });

      // Detect available hardware encoders in FFmpeg build
      const hwEncoders = {
        nvenc: encoders.includes('h264_nvenc'),    // NVIDIA
        qsv: encoders.includes('h264_qsv'),        // Intel Quick Sync
        amf: encoders.includes('h264_amf'),        // AMD
        videotoolbox: encoders.includes('h264_videotoolbox'), // macOS
        vaapi: encoders.includes('h264_vaapi')     // Linux VA-API
      };

      this.hwEncoders = hwEncoders;

      // Test if GPU is actually available (not just built into FFmpeg)
      let selectedEncoder = 'libx264'; // Default software encoder
      let gpuType = 'CPU';
      let actuallyAvailable = false;

      // Try NVIDIA first
      if (hwEncoders.nvenc) {
        console.log('[FFmpeg] Testing NVIDIA NVENC...');
        if (await this.testEncoder('h264_nvenc')) {
          selectedEncoder = 'h264_nvenc';
          gpuType = 'NVIDIA GPU';
          actuallyAvailable = true;
          console.log('[FFmpeg] ✅ NVIDIA NVENC is working');
        } else {
          console.log('[FFmpeg] ⚠️  NVIDIA NVENC found but not functional (no GPU or driver issue)');
        }
      }

      // Try AMD if NVIDIA didn't work
      if (!actuallyAvailable && hwEncoders.amf) {
        console.log('[FFmpeg] Testing AMD AMF...');
        if (await this.testEncoder('h264_amf')) {
          selectedEncoder = 'h264_amf';
          gpuType = 'AMD GPU';
          actuallyAvailable = true;
          console.log('[FFmpeg] ✅ AMD AMF is working');
        } else {
          console.log('[FFmpeg] ⚠️  AMD AMF found but not functional');
        }
      }

      // Try Intel QSV
      if (!actuallyAvailable && hwEncoders.qsv) {
        console.log('[FFmpeg] Testing Intel Quick Sync...');
        if (await this.testEncoder('h264_qsv')) {
          selectedEncoder = 'h264_qsv';
          gpuType = 'Intel Quick Sync';
          actuallyAvailable = true;
          console.log('[FFmpeg] ✅ Intel Quick Sync is working');
        } else {
          console.log('[FFmpeg] ⚠️  Intel Quick Sync found but not functional');
        }
      }

      this.gpuInfo = {
        type: gpuType,
        encoder: selectedEncoder,
        hwEncoders,
        hwAccelAvailable: actuallyAvailable
      };

      console.log('[FFmpeg] GPU Detection Results:');
      console.log(`  - GPU Type: ${gpuType}`);
      console.log(`  - Selected Encoder: ${selectedEncoder}`);
      console.log(`  - Hardware Acceleration: ${actuallyAvailable ? 'ENABLED' : 'DISABLED (using CPU)'}`);

      if (!actuallyAvailable && (hwEncoders.nvenc || hwEncoders.amf || hwEncoders.qsv)) {
        console.log('[FFmpeg] ℹ️  GPU encoders are built into FFmpeg but no GPU detected');
        console.log('[FFmpeg] ℹ️  This is normal in VirtualBox or systems without GPUs');
      }

      return this.gpuInfo;

    } catch (error) {
      console.warn('[FFmpeg] GPU detection failed, falling back to CPU encoding:', error.message);
      this.gpuInfo = {
        type: 'CPU',
        encoder: 'libx264',
        hwEncoders: {},
        hwAccelAvailable: false
      };
      return this.gpuInfo;
    }
  }

  /**
   * Test if a hardware encoder actually works
   */
  async testEncoder(encoder) {
    try {
      // Try to encode a single black frame to test the encoder
      const testCommand = `"${this.ffmpegPath}" -f lavfi -i color=black:s=64x64:d=0.1 -c:v ${encoder} -f null - 2>&1`;

      execSync(testCommand, {
        encoding: 'utf8',
        timeout: 5000,
        stdio: 'pipe'
      });

      return true;
    } catch (error) {
      // Encoder failed - GPU not available
      return false;
    }
  }

  /**
   * Start HLS stream from concat file
   * @param {string} streamId - Unique identifier for this stream
   * @param {string} concatFilePath - Path to concat.txt file
   * @param {string} outputDir - Directory for HLS output
   * @param {Object} options - FFmpeg options
   */
  async startStream(streamId, concatFilePath, outputDir, options = {}) {
    // Stop existing stream if running
    if (this.activeStreams.has(streamId)) {
      await this.stopStream(streamId);
    }

    // Detect GPU capabilities (cached after first run)
    await this.detectGPU();

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Default options
    const {
      segmentDuration = 6,
      videoBitrate = '1500k',
      audioBitrate = '128k',
      resolution = '1920x1080',
      fps = 30,
      preset = 'veryfast',
      useGPU = true,  // Enable GPU by default if available
      encoder = null  // Allow manual encoder override
    } = options;

    // Determine encoder to use
    let videoEncoder = encoder || (useGPU ? this.gpuInfo.encoder : 'libx264');
    const isHwEncoder = videoEncoder !== 'libx264';

    console.log(`[FFmpeg] Stream ${streamId} using encoder: ${videoEncoder}${isHwEncoder ? ' (GPU)' : ' (CPU)'}`);

    const outputM3u8 = path.join(outputDir, 'stream.m3u8');
    const outputSegment = path.join(outputDir, 'stream_%03d.ts');

    // Build FFmpeg arguments
    const args = [];

    // Add hardware acceleration BEFORE input (if using GPU encoder)
    if (isHwEncoder) {
      if (videoEncoder === 'h264_nvenc') {
        // NVIDIA NVENC
        args.push('-hwaccel', 'cuda');
        args.push('-hwaccel_output_format', 'cuda');
      } else if (videoEncoder === 'h264_qsv') {
        // Intel Quick Sync
        args.push('-hwaccel', 'qsv');
      } else if (videoEncoder === 'h264_amf') {
        // AMD AMF (uses DirectX on Windows)
        if (os.platform() === 'win32') {
          args.push('-hwaccel', 'd3d11va');
        }
      } else if (videoEncoder === 'h264_vaapi') {
        // VA-API (Linux)
        args.push('-hwaccel', 'vaapi');
        args.push('-vaapi_device', '/dev/dri/renderD128');
      }
    }

    // Input (hwaccel options must come BEFORE this)
    args.push(
      '-f', 'concat',
      '-safe', '0',
      '-re', // Real-time mode
      '-i', concatFilePath
    );

    // Video encoding settings
    args.push('-c:v', videoEncoder);

    // Encoder-specific settings
    if (videoEncoder === 'h264_nvenc') {
      // NVIDIA NVENC settings
      args.push('-preset', 'p4'); // p1 (fastest) to p7 (slowest)
      args.push('-tune', 'hq'); // High quality
      args.push('-b:v', videoBitrate);
      args.push('-maxrate', videoBitrate);
      args.push('-bufsize', '3000k');
      args.push('-rc', 'vbr'); // Variable bitrate
    } else if (videoEncoder === 'h264_qsv') {
      // Intel Quick Sync settings
      args.push('-preset', 'medium');
      args.push('-b:v', videoBitrate);
      args.push('-maxrate', videoBitrate);
      args.push('-bufsize', '3000k');
    } else if (videoEncoder === 'h264_amf') {
      // AMD AMF settings
      args.push('-quality', 'balanced'); // speed, balanced, quality
      args.push('-b:v', videoBitrate);
      args.push('-maxrate', videoBitrate);
      args.push('-bufsize', '3000k');
    } else {
      // Software encoding (libx264)
      args.push('-preset', preset);
      args.push('-b:v', videoBitrate);
      args.push('-maxrate', videoBitrate);
      args.push('-bufsize', '3000k');
    }

    // Audio codec
    args.push(
      '-c:a', 'aac',
      '-b:a', audioBitrate,
      '-ar', '48000',
      '-ac', '2'
    );

    // Video filters (scaling, padding, fps)
    // Convert resolution format: "1920x1080" for scale, "1920:1080" for pad
    const padResolution = resolution.replace('x', ':');

    if (isHwEncoder && videoEncoder === 'h264_nvenc') {
      // Use CUDA-accelerated scaling for NVENC
      args.push('-vf', `scale_cuda=${resolution}:force_original_aspect_ratio=decrease,hwdownload,format=nv12`);
    } else {
      args.push('-vf', `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${padResolution}:(ow-iw)/2:(oh-ih)/2:black`);
    }

    args.push('-pix_fmt', 'yuv420p');
    args.push('-r', fps.toString());

    // HLS options
    args.push(
      '-f', 'hls',
      '-hls_time', segmentDuration.toString(),
      '-hls_list_size', '10',
      '-hls_flags', 'delete_segments+omit_endlist',
      '-hls_segment_type', 'mpegts',
      '-hls_segment_filename', outputSegment,
      '-y',
      outputM3u8
    );

    console.log(`[FFmpeg] Starting stream: ${streamId}`);
    console.log(`[FFmpeg] Command: ${this.ffmpegPath} ${args.join(' ')}`);

    const ffmpegProcess = spawn(this.ffmpegPath, args);

    let stderr = '';
    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      // Log important FFmpeg messages
      const line = data.toString();
      if (line.includes('error') || line.includes('Error')) {
        console.error(`[FFmpeg Error] ${streamId}: ${line}`);
      }
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`[FFmpeg] Stream ${streamId} exited with code ${code}`);
      if (code !== 0) {
        console.error(`[FFmpeg] stderr:\n${stderr.slice(-1000)}`);
      }
      this.activeStreams.delete(streamId);
    });

    ffmpegProcess.on('error', (error) => {
      console.error(`[FFmpeg] Failed to start stream ${streamId}:`, error);
      this.activeStreams.delete(streamId);
    });

    // Store process info
    this.activeStreams.set(streamId, {
      process: ffmpegProcess,
      outputDir,
      startTime: Date.now()
    });

    // Wait a bit for segments to start generating
    await this.waitForSegments(outputDir, 10000);

    return {
      streamId,
      m3u8Path: `/stream/${streamId}/stream.m3u8`,
      outputDir
    };
  }

  /**
   * Wait for HLS segments to start appearing
   */
  async waitForSegments(outputDir, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const files = await fs.readdir(outputDir);
        const segmentFiles = files.filter(f => f.endsWith('.ts'));
        if (segmentFiles.length > 0) {
          console.log(`[FFmpeg] Segments detected: ${segmentFiles.length} files`);
          return true;
        }
      } catch (error) {
        // Directory might not exist yet
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.warn(`[FFmpeg] Timeout waiting for segments (${timeout}ms)`);
    return false;
  }

  /**
   * Stop a stream
   */
  async stopStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      console.log(`[FFmpeg] Stream ${streamId} not found (already stopped?)`);
      return;
    }

    console.log(`[FFmpeg] Stopping stream: ${streamId}`);

    try {
      stream.process.kill('SIGTERM');

      // Force kill after 2 seconds if still running
      setTimeout(() => {
        if (stream.process.killed === false) {
          stream.process.kill('SIGKILL');
        }
      }, 2000);
    } catch (error) {
      console.error(`[FFmpeg] Error stopping stream ${streamId}:`, error);
    }

    this.activeStreams.delete(streamId);
  }

  /**
   * Get active streams
   */
  getActiveStreams() {
    const streams = [];
    for (const [streamId, info] of this.activeStreams.entries()) {
      streams.push({
        streamId,
        outputDir: info.outputDir,
        uptime: Date.now() - info.startTime
      });
    }
    return streams;
  }

  /**
   * Stop all streams
   */
  async stopAll() {
    console.log(`[FFmpeg] Stopping all streams (${this.activeStreams.size})`);
    const promises = [];
    for (const streamId of this.activeStreams.keys()) {
      promises.push(this.stopStream(streamId));
    }
    await Promise.all(promises);
  }
}

module.exports = FFmpegStreamer;
