const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Keep a global reference of the window object
// If you don't, the window will be closed automatically when the JavaScript object is garbage collected
let mainWindow;

function createWindow() {
  // Create the browser window with modern settings
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets/icon.ico'), // Your custom icon
    webPreferences: {
      nodeIntegration: false, // Security: don't allow Node.js in renderer
      contextIsolation: true, // Security: isolate context
      enableRemoteModule: false, // Security: disable remote module
      webSecurity: true, // Security: enable web security
      allowRunningInsecureContent: false // Security: don't allow insecure content
    },
    // Modern window appearance
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    backgroundColor: '#ffffff' // Set background color to prevent white flash
  });

  // Load your app based on environment
  // In development, always load from Vite dev server
  // In production, load from built files
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed event
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });

  // Handle external links (open in default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// This method will be called when Electron has finished initialization
// and is ready to create browser windows
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it's common for applications to stay open even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

  // Security: prevent new window creation
  app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });
  });

// Handle app ready state
app.on('ready', () => {
  console.log('TikTok Gift Key Mapper is ready!');
});
