const fs = require('fs').promises;
const path = require('path');

class MediaScanner {
  constructor() {
    this.videoExtensions = [
      '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
      '.m4v', '.mpg', '.mpeg', '.3gp', '.ts', '.mts', '.m2ts'
    ];
  }

  /**
   * Check if file is a video based on extension
   */
  isVideoFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.videoExtensions.includes(ext);
  }

  /**
   * Scan directory for video files
   * @param {string} dir - Directory to scan (defaults to cwd)
   * @param {boolean} recursive - Whether to scan subdirectories
   */
  async scanDirectory(dir = process.cwd(), recursive = false) {
    const videoFiles = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip common non-media directories
          const skipDirs = ['node_modules', '.git', 'dist', 'output', 'playlists', 'ffmpeg-dist', 'bin'];
          if (recursive && !skipDirs.includes(entry.name)) {
            const subFiles = await this.scanDirectory(fullPath, recursive);
            videoFiles.push(...subFiles);
          }
        } else if (entry.isFile() && this.isVideoFile(entry.name)) {
          videoFiles.push({
            path: fullPath,
            name: entry.name,
            size: 0 // We'll get size if needed
          });
        }
      }
    } catch (error) {
      console.error(`[MediaScanner] Error scanning ${dir}:`, error.message);
    }

    return videoFiles;
  }

  /**
   * Get file stats for videos
   */
  async getFileStats(files) {
    const filesWithStats = [];

    for (const file of files) {
      try {
        const stats = await fs.stat(file.path);
        filesWithStats.push({
          ...file,
          size: stats.size,
          modified: stats.mtime
        });
      } catch (error) {
        console.warn(`[MediaScanner] Could not stat ${file.name}:`, error.message);
      }
    }

    return filesWithStats;
  }

  /**
   * Sort files by name (natural sort)
   */
  sortByName(files) {
    return files.sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });
  }

  /**
   * Sort files by modification time
   */
  sortByDate(files) {
    return files.sort((a, b) => b.modified - a.modified);
  }

  /**
   * Format file size for display
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create a playlist from directory
   * @param {string} dir - Directory to scan
   * @param {Object} options - Scan options
   */
  async createPlaylist(dir = process.cwd(), options = {}) {
    const {
      recursive = false,
      sortBy = 'name', // 'name', 'date', 'size'
      includeStats = true
    } = options;

    console.log(`[MediaScanner] Scanning for video files in: ${dir}`);
    if (recursive) {
      console.log('[MediaScanner] Recursive mode enabled');
    }

    let files = await this.scanDirectory(dir, recursive);

    if (files.length === 0) {
      return {
        files: [],
        count: 0,
        totalSize: 0
      };
    }

    // Get file stats if requested
    if (includeStats) {
      files = await this.getFileStats(files);
    }

    // Sort files
    switch (sortBy) {
      case 'name':
        files = this.sortByName(files);
        break;
      case 'date':
        files = this.sortByDate(files);
        break;
      case 'size':
        files = files.sort((a, b) => b.size - a.size);
        break;
    }

    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    return {
      files,
      count: files.length,
      totalSize,
      directory: dir
    };
  }

  /**
   * Print playlist summary to console
   */
  printPlaylist(playlist) {
    if (playlist.count === 0) {
      console.log('[MediaScanner] ⚠️  No video files found in current directory');
      console.log('[MediaScanner] Supported formats:', this.videoExtensions.join(', '));
      return;
    }

    console.log(`[MediaScanner] ✅ Found ${playlist.count} video file(s)`);
    console.log(`[MediaScanner] Total size: ${this.formatSize(playlist.totalSize)}`);
    console.log('');
    console.log('Playlist:');
    console.log('─────────────────────────────────────────────────────────');

    playlist.files.forEach((file, index) => {
      const num = String(index + 1).padStart(2, '0');
      const size = this.formatSize(file.size);
      console.log(`  ${num}. ${file.name} (${size})`);
    });

    console.log('─────────────────────────────────────────────────────────');
    console.log('');
  }
}

module.exports = MediaScanner;
