/**
 * Module in charge of the Windows Thumbar
 * (buttons appearing on Museeks preview when hovering the icon)
 *
 * Windows only
 *
 * CURRENTLY IN A BROKEN STATE
 * https://github.com/electron/electron/issues/9049
 */

const path = require('path');
const { nativeImage, ipcMain } = require('electron');
const { createFromPath } = nativeImage;

const Module = require('./module');
const constants = require('../constants');

const iconsDirectory = path.resolve(__dirname, '../..', 'images', 'icons', 'windows');


class ThumbarModule extends Module {
  static get PLATFORMS() {
    return ['win32'];
  }

  static get LOAD_AT() {
    return constants.ON_BROWSERWINDOW_READY;
  }

  constructor(window) {
    super(window);
  }

  load() {
    const window = this.window;

    const icons = {
      play:          createFromPath(path.join(iconsDirectory, 'play.ico')),
      playDisabled:  createFromPath(path.join(iconsDirectory, 'play-disabled.ico')),
      pause:         createFromPath(path.join(iconsDirectory, 'pause.ico')),
      pauseDisabled: createFromPath(path.join(iconsDirectory, 'pause-disabled.ico')),
      prev:          createFromPath(path.join(iconsDirectory, 'backward.ico')),
      prevDisabled:  createFromPath(path.join(iconsDirectory, 'backward-disabled.ico')),
      next:          createFromPath(path.join(iconsDirectory, 'forward.ico')),
      nextDisabled:  createFromPath(path.join(iconsDirectory, 'forward-disabled.ico')),
    };

    const thumbarButtons = {
      play: {
        tooltip: 'Play',
        icon: icons.play,
        click: () => {
          window.webContents.send('playerAction', 'play');
        },
      },
      playDisabled: {
        tooltip: 'Play',
        flags: ['disabled'],
        icon: icons.playDisabled,
      },
      pause: {
        tooltip: 'Pause',
        icon: icons.pause,
        click: () => {
          window.webContents.send('playerAction', 'pause');
        },
      },
      pauseDisabled: {
        tooltip: 'Pause',
        flags: ['disabled'],
        icon: icons.pauseDisabled,
      },
      prev: {
        tooltip: 'Prev',
        icon: icons.prev,
        click: () => {
          window.webContents.send('playerAction', 'prev');
        },
      },
      prevDisabled: {
        tooltip: 'Prev',
        flags: ['disabled'],
        icon: icons.prevDisabled,
      },
      next: {
        tooltip: 'Next',
        icon: icons.next,
        click: () => {
          window.webContents.send('playerAction', 'next');
        },
      },
      nextDisabled: {
        tooltip: 'Next',
        flags: ['disabled'],
        icon: icons.nextDisabled,
      },
    };

    ipcMain.on('appReady', () => {
      window.setThumbarButtons([
        thumbarButtons.prevDisabled,
        thumbarButtons.playDisabled,
        thumbarButtons.nextDisabled,
      ]);
    });

    ipcMain.on('playerAction', (event, arg) => {
      switch(arg) {
        case 'play':
          window.setThumbarButtons([
            thumbarButtons.prev,
            thumbarButtons.pause,
            thumbarButtons.next,
          ]);
          break;
        case 'pause':
          window.setThumbarButtons([
            thumbarButtons.prev,
            thumbarButtons.play,
            thumbarButtons.next,
          ]);
          break;
        case 'stop':
          window.setThumbarButtons([
            thumbarButtons.prevDisabled,
            thumbarButtons.playDisabled,
            thumbarButtons.nextDisabled,
          ]);
          break;
      }
    });
  }
}


module.exports = ThumbarModule;
