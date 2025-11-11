const SysTray = require('systray2').default;
const open = require('open');
const path = require('path');
const os = require('os');

class SystemTrayGUI {
  constructor(server) {
    this.server = server;
    this.isServerRunning = false;
    this.serverInstance = null;
    this.PORT = process.env.PORT || 3000;

    console.log('[GUI] Initializing system tray...');
    console.log('[GUI] Process working directory:', process.cwd());
    console.log('[GUI] Process executable path:', process.execPath);

    this.systray = new SysTray({
      menu: {
        icon: this.getIconPath(),
        title: 'HLS Streamer',
        tooltip: 'Simple HLS Streamer',
        items: [
          {
            title: 'Status: Stopped',
            tooltip: 'Server status',
            checked: false,
            enabled: false,
            key: 'status'
          },
          {
            title: '─────────────',
            enabled: false
          },
          {
            title: 'Start Server',
            tooltip: 'Start the HLS streaming server',
            checked: false,
            enabled: true,
            key: 'start'
          },
          {
            title: 'Stop Server',
            tooltip: 'Stop the HLS streaming server',
            checked: false,
            enabled: false,
            key: 'stop'
          },
          {
            title: '─────────────',
            enabled: false
          },
          {
            title: 'Open Player',
            tooltip: 'Open the web player in browser',
            checked: false,
            enabled: false,
            key: 'player'
          },
          {
            title: 'Open API Docs',
            tooltip: 'View API documentation',
            checked: false,
            enabled: false,
            key: 'docs'
          },
          {
            title: '─────────────',
            enabled: false
          },
          {
            title: 'Exit',
            tooltip: 'Exit the application',
            checked: false,
            enabled: true,
            key: 'exit'
          }
        ]
      },
      debug: false,
      copyDir: true
    });

    this.systray.onClick(action => {
      this.handleMenuClick(action);
    });

    console.log('[GUI] System tray initialized');
  }

  getIconPath() {
    // Simple base64 encoded icon (white circle on transparent background)
    // In production, you'd use a proper .ico file
    if (os.platform() === 'win32') {
      // Try to find an icon file, fallback to base64
      const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
      try {
        require('fs').accessSync(iconPath);
        return iconPath;
      } catch {
        // Return base64 encoded small icon
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADeSURBVFhH7ZZBDoIwEEVbPYRH8AZewRt4BI/gEbyBN/AIHsEjsHBBYqL/T6YkJCZNpzNN+pJJFw397TSdFv6VjuMYnHMBYwy01pBzhlpr7/s+OOdikr1F0zTQNA1IKUEIAVVVkVJKWJblMU3Tl3n2MsbYPwBgWRbved6LvG3bZ2PMj/ntdrvBcRx/3/d+nufHPM/frusezzQNUkr/VErpfd9/jOP4mKbpxbz+OI4hhPAkhPAhhPAEY4wa6L13Sin/Cg9TSvnGvD5X1rbtT/N6FEVfzOsR0RFCOBHRgYiO/wLeAE2FPzjHWfEAAAAAAElFTkSuQmCC';
      }
    }
    // For other platforms, return empty string (systray2 will use default)
    return '';
  }

  async handleMenuClick(action) {
    console.log('[GUI] Menu click:', action.item.key);

    switch (action.item.key) {
      case 'start':
        await this.startServer();
        break;

      case 'stop':
        await this.stopServer();
        break;

      case 'player':
        this.openPlayer();
        break;

      case 'docs':
        this.openDocs();
        break;

      case 'exit':
        await this.exit();
        break;
    }
  }

  async startServer() {
    if (this.isServerRunning) {
      console.log('[GUI] Server already running');
      return;
    }

    console.log('[GUI] Starting server...');

    try {
      // Start the server
      this.serverInstance = await this.server.start(this.PORT);
      this.isServerRunning = true;

      console.log(`[GUI] Server started on http://localhost:${this.PORT}`);

      // Update menu
      this.updateMenu('running');

      // Auto-open player after 2 seconds (give server time to fully start)
      setTimeout(() => {
        console.log('[GUI] Auto-opening player...');
        this.openPlayer();
      }, 2000);

    } catch (error) {
      console.error('[GUI] Failed to start server:', error.message);
      this.updateMenu('error');
    }
  }

  async stopServer() {
    if (!this.isServerRunning) {
      console.log('[GUI] Server not running');
      return;
    }

    console.log('[GUI] Stopping server...');

    try {
      if (this.serverInstance && this.serverInstance.close) {
        await new Promise((resolve) => {
          this.serverInstance.close(() => {
            console.log('[GUI] Server stopped');
            resolve();
          });
        });
      }

      this.isServerRunning = false;
      this.serverInstance = null;

      // Update menu
      this.updateMenu('stopped');

    } catch (error) {
      console.error('[GUI] Failed to stop server:', error.message);
    }
  }

  openPlayer() {
    const url = `http://localhost:${this.PORT}/player.html`;
    console.log('[GUI] Opening player:', url);
    open(url).catch(err => {
      console.error('[GUI] Failed to open browser:', err.message);
    });
  }

  openDocs() {
    const url = `http://localhost:${this.PORT}/`;
    console.log('[GUI] Opening API docs:', url);
    open(url).catch(err => {
      console.error('[GUI] Failed to open browser:', err.message);
    });
  }

  updateMenu(state) {
    const items = this.systray.menu.items;

    switch (state) {
      case 'running':
        items[0].title = 'Status: Running';
        items[2].enabled = false; // Start Server
        items[3].enabled = true;  // Stop Server
        items[5].enabled = true;  // Open Player
        items[6].enabled = true;  // Open API Docs
        break;

      case 'stopped':
        items[0].title = 'Status: Stopped';
        items[2].enabled = true;  // Start Server
        items[3].enabled = false; // Stop Server
        items[5].enabled = false; // Open Player
        items[6].enabled = false; // Open API Docs
        break;

      case 'error':
        items[0].title = 'Status: Error';
        items[2].enabled = true;  // Start Server
        items[3].enabled = false; // Stop Server
        items[5].enabled = false; // Open Player
        items[6].enabled = false; // Open API Docs
        break;
    }

    this.systray.sendAction({
      type: 'update-menu',
      menu: this.systray.menu
    });
  }

  async exit() {
    console.log('[GUI] Exiting application...');

    // Stop server if running
    if (this.isServerRunning) {
      await this.stopServer();
    }

    // Kill the systray
    await this.systray.kill();

    process.exit(0);
  }
}

module.exports = SystemTrayGUI;
