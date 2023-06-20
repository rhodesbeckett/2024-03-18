import path from 'path';

import { app, BrowserWindow } from 'electron';
import remote from '@electron/remote/main';

import logger from '../shared/lib/logger';

import AppModule from './modules/AppModule';
import ApplicationMenuModule from './modules/ApplicationMenuModule';
import ConfigModule from './modules/ConfigModule';
import PowerModule from './modules/PowerMonitorModule';
import ThumbarModule from './modules/ThumbarModule';
import DockMenuModule from './modules/DockMenuDarwinModule';
import SleepBlockerModule from './modules/SleepBlockerModule';
import DialogsModule from './modules/DialogsModule';
import NativeThemeModule from './modules/NativeThemeModule';
import DevtoolsModule from './modules/DevtoolsModule';
import WindowPositionModule from './modules/WindowPositionModule';
import IPCCoverModule from './modules/IPCCoverModule';
import IPCLibraryModule from './modules/IPCLibraryModule';
import IPCNotificationsModule from './modules/IPCNotificationsModule';
import IPCPlaylistsModule from './modules/IPCPlaylistsModule';
import * as ModulesManager from './lib/modules-manager';
import { checkBounds } from './lib/utils';

const appRoot = path.resolve(__dirname, '..'); // Careful, not future-proof
const rendererDistPath = path.join(appRoot, 'renderer');
const preloadDistPath = path.join(appRoot, 'preload');

// @deprecated Remove all usage of remote in the app
remote.initialize();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the javascript object is GCed.
let mainWindow: Electron.BrowserWindow | null = null;

// This method will be called when Electron has finished its
// initialization and ready to create browser windows.
app.whenReady().then(async () => {
  const configModule = new ConfigModule();
  await ModulesManager.init(configModule);
  const config = configModule.getConfig();

  const bounds = checkBounds(configModule.config.getx('bounds'));

  // Create the browser window
  mainWindow = new BrowserWindow({
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
    show: false,
    webPreferences: {
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      allowRunningInsecureContent: false,
      autoplayPolicy: 'no-user-gesture-required',
      webSecurity: process.env.ELECTRON_RENDERER_URL == null, // Cannot load local resources without that
      preload: path.join(preloadDistPath, 'entrypoint.js'),
    },
  });

  // Open dev tools if museeks runs in debug or development mode
  if (
    process.argv.includes('--devtools') ||
    process.env.NODE_ENV === 'development' ||
    process.env.VITE_DEV_SERVER_URL
  ) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });

  // Prevent webContents from opening new windows (e.g ctrl-click on link)
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // @deprecated Remove all usage of remote in the app
  remote.enable(mainWindow.webContents);

  // ... and load the html page generated by Vite
  const viewSuffix = `#/${configModule.config.get('defaultView')}`;

  let url: string;

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    url = `${process.env['ELECTRON_RENDERER_URL']}${viewSuffix}`;
  } else {
    url = `file://${rendererDistPath}/index.html${viewSuffix}`;
  }

  logger.info(`Loading file ${url}`);
  mainWindow.loadURL(url);

  // Let's list the list of modules we will use for Museeks
  ModulesManager.init(
    new AppModule(mainWindow, config),
    new PowerModule(mainWindow),
    new ApplicationMenuModule(mainWindow),
    new ThumbarModule(mainWindow),
    new DockMenuModule(mainWindow),
    new SleepBlockerModule(mainWindow),
    new DialogsModule(mainWindow),
    new NativeThemeModule(mainWindow, config),
    new DevtoolsModule(mainWindow),
    new WindowPositionModule(mainWindow, config),
    // Modules used to handle IPC APIs
    new IPCCoverModule(mainWindow),
    new IPCLibraryModule(mainWindow),
    new IPCNotificationsModule(mainWindow, config),
    new IPCPlaylistsModule(mainWindow),
  ).catch(logger.error);
});
