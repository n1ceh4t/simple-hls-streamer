const fs = require('fs').promises;
const path = require('path');

class PlaylistManager {
  constructor(playlistsDir = './playlists') {
    this.playlistsDir = playlistsDir;
  }

  /**
   * Create concat file from list of file paths
   * @param {string} playlistId - Unique identifier for this playlist
   * @param {string[]} filePaths - Array of absolute file paths to media files
   * @returns {string} Path to created concat.txt file
   */
  async createConcatFile(playlistId, filePaths) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      throw new Error('filePaths must be a non-empty array');
    }

    // Ensure playlists directory exists
    await fs.mkdir(this.playlistsDir, { recursive: true });

    const concatFilePath = path.join(this.playlistsDir, `${playlistId}_concat.txt`);

    // Build concat file content
    // Format: file '/absolute/path/to/file.mp4'
    // On Windows, normalize backslashes to forward slashes for FFmpeg
    const lines = filePaths.map(filePath => {
      // Normalize path for FFmpeg (uses forward slashes on all platforms)
      let normalizedPath = filePath.replace(/\\/g, '/');

      // Escape single quotes and special characters for FFmpeg concat format
      // Single quotes need to be escaped as '\''
      normalizedPath = normalizedPath.replace(/'/g, "'\\''");

      return `file '${normalizedPath}'`;
    });

    const content = lines.join('\n') + '\n';

    // Write concat file
    await fs.writeFile(concatFilePath, content, 'utf-8');

    console.log(`[Playlist] Created concat file: ${concatFilePath}`);
    console.log(`[Playlist] Files: ${filePaths.length}`);

    return concatFilePath;
  }

  /**
   * Load playlist from JSON file
   * @param {string} playlistFile - Path to JSON file containing array of file paths
   */
  async loadPlaylistFromFile(playlistFile) {
    const content = await fs.readFile(playlistFile, 'utf-8');
    const playlist = JSON.parse(content);

    if (!Array.isArray(playlist.files)) {
      throw new Error('Playlist JSON must have a "files" array property');
    }

    return playlist.files;
  }

  /**
   * Validate that all files in the list exist
   */
  async validateFiles(filePaths) {
    const results = await Promise.allSettled(
      filePaths.map(async (filePath) => {
        try {
          await fs.access(filePath);
          return { path: filePath, exists: true };
        } catch {
          return { path: filePath, exists: false };
        }
      })
    );

    const missingFiles = results
      .filter(r => r.status === 'fulfilled' && !r.value.exists)
      .map(r => r.value.path);

    if (missingFiles.length > 0) {
      console.warn(`[Playlist] Warning: ${missingFiles.length} files not found:`);
      missingFiles.forEach(file => console.warn(`  - ${file}`));
    }

    return {
      total: filePaths.length,
      existing: filePaths.length - missingFiles.length,
      missing: missingFiles
    };
  }

  /**
   * Get all concat files in playlists directory
   */
  async listConcatFiles() {
    try {
      const files = await fs.readdir(this.playlistsDir);
      return files.filter(f => f.endsWith('_concat.txt'));
    } catch {
      return [];
    }
  }

  /**
   * Delete a concat file
   */
  async deleteConcatFile(playlistId) {
    const concatFilePath = path.join(this.playlistsDir, `${playlistId}_concat.txt`);
    try {
      await fs.unlink(concatFilePath);
      console.log(`[Playlist] Deleted concat file: ${concatFilePath}`);
      return true;
    } catch (error) {
      console.error(`[Playlist] Failed to delete concat file: ${error.message}`);
      return false;
    }
  }
}

module.exports = PlaylistManager;
