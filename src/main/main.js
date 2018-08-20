

const path = require('path');
const os = require('os');
const electron = require('electron');

const IpcModule = require('./modules/ipc'); // Manages IPC events
const MenuModule = require('./modules/menu'); // Manage menu
const TrayModule = require('./modules/tray'); // Manages Tray
const ConfigModule = require('./modules/config'); // Handles config
const PowerModule = require('./modules/power-monitor'); // Handle power events
const ThumbarModule = require('./modules/thumbar'); // Handle Windows Thumbar
const DockMenuModule = require('./modules/dock-menu');
const GlobalShortcutsModule = require('./modules/global-shortcuts');

const ModulesManager = require('./lib/modules-manager');
const { checkBounds } = require('./utils');

const { app, BrowserWindow } = electron;

const appRoot = path.resolve(__dirname, '../..'); // Careful, not future-proof
const uiDistPath = path.join(appRoot, 'dist/ui');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
let mainWindow = null;

// Make the app a single-instance app
const shouldQuit = app.makeSingleInstance(() => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

if (shouldQuit) {
  app.exit();
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
  app.quit();
});

// Let's list the list of modules we will use for Museeks

// This method will be called when Electron has finished its
// initialization and ready to create browser windows.
app.on('ready', () => {
  const configModule = new ConfigModule();
  ModulesManager.init(
    configModule,
  );

  const config = configModule.getConfig();
  let { bounds } = config;

  bounds = checkBounds(bounds);

  // Browser Window options
  const mainWindowOptions = {
    title: 'Museeks',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 900,
    minHeight: 550,
    frame: true,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset', // MacOS polished window
    show: false
  };

  // Create the browser window
  mainWindow = new BrowserWindow(mainWindowOptions);

  // ... and load the html page generated by Webpack
  mainWindow.loadURL(`file://${uiDistPath}/index.html#/library`);

  // Open dev tools if museeks is run in debug mode
  if (process.argv.includes('--devtools')) mainWindow.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  // Click on the dock icon to show the app again on macOS
  app.on('activate', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Prevent webContents from opening new windows (e.g ctrl-click on link)
  mainWindow.webContents.on('new-window', (e) => {
    e.preventDefault();
  });

  ModulesManager.init(
    new IpcModule(mainWindow, configModule),
    new PowerModule(mainWindow),
    new MenuModule(mainWindow),
    new TrayModule(mainWindow),
    new ThumbarModule(mainWindow),
    new DockMenuModule(mainWindow),
    new GlobalShortcutsModule(mainWindow),
  );
});
