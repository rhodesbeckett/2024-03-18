import * as semver from 'semver';

import channels from '../../shared/lib/ipc-channels';
import { Config, Theme } from '../../shared/types/museeks';
import logger from '../../shared/lib/logger';

import useToastsStore from './useToastsStore';

const { ipcRenderer } = window.ElectronAPI;
const { config } = window.MuseeksAPI;

interface UpdateCheckOptions {
  silentFail?: boolean;
}

const getTheme = async (): Promise<string> => {
  const themeID = await ipcRenderer.invoke(channels.THEME_GET_ID);

  return themeID;
};

const setTheme = async (themeID: string): Promise<void> => {
  await ipcRenderer.invoke(channels.THEME_SET_ID, themeID);
  await checkTheme();
};

/**
 * Apply theme colors to  the BrowserWindow
 */
const applyThemeToUI = async (theme: Theme): Promise<void> => {
  // TODO think about variables validity?
  const root = document.documentElement;

  Object.entries(theme.variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

const checkTheme = async (): Promise<void> => {
  const theme: Theme = await ipcRenderer.invoke(channels.THEME_GET);
  applyThemeToUI(theme);
};

const setTracksDensity = async (
  density: Config['tracksDensity'],
): Promise<void> => {
  await window.MuseeksAPI.config.set('tracksDensity', density);
};

/**
 * Check and enable sleep blocker if needed
 */
const checkSleepBlocker = async (): Promise<void> => {
  if (await config.get('sleepBlocker')) {
    ipcRenderer.send('settings:toggleSleepBlocker', true);
  }
};

/**
 * Check if a new release is available
 */
const checkForUpdate = async (
  options: UpdateCheckOptions = {},
): Promise<void> => {
  const currentVersion = window.MuseeksAPI.version;

  try {
    const response = await fetch(
      'https://api.github.com/repos/martpie/museeks/releases',
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const releases: any = await response.json();

    // TODO Github API types?
    const newRelease = releases.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (release: any) =>
        semver.valid(release.tag_name) !== null &&
        semver.gt(release.tag_name, currentVersion),
    );

    let message;
    if (newRelease) {
      message = `Museeks ${newRelease.tag_name} is available, check http://museeks.io!`;
    } else if (!options.silentFail) {
      message = `Museeks ${currentVersion} is the latest version available.`;
    }

    if (message) {
      useToastsStore.getState().api.add('success', message);
    }
  } catch (e) {
    if (!options.silentFail)
      useToastsStore
        .getState()
        .api.add('danger', 'An error occurred while checking updates.');
  }
};

/**
 * Init all settings
 */
const check = async (): Promise<void> => {
  await checkTheme();
  checkSleepBlocker();
  if (await config.get('autoUpdateChecker')) {
    checkForUpdate({ silentFail: true }).catch((err) => {
      logger.error(err);
    });
  }
};

/**
 * Toggle sleep blocker
 */
const toggleSleepBlocker = async (value: boolean): Promise<void> => {
  await config.set('sleepBlocker', value);

  ipcRenderer.send('settings:toggleSleepBlocker', value);
};

/**
 * Set the default view of the app
 */
const setDefaultView = async (value: string): Promise<void> => {
  await config.set('defaultView', value);
};

/**
 * Toggle update check on startup
 */
const toggleAutoUpdateChecker = async (value: boolean): Promise<void> => {
  await config.set('autoUpdateChecker', value);
};

/**
 * Toggle native notifications display
 */
const toggleDisplayNotifications = async (value: boolean): Promise<void> => {
  await config.set('displayNotifications', value);
};

// Should we use something else to harmonize between zustand and non-store APIs?
const SettingsAPI = {
  getTheme,
  setTheme,
  applyThemeToUI,
  setTracksDensity,
  check,
  checkTheme,
  checkSleepBlocker,
  checkForUpdate,
  toggleSleepBlocker,
  setDefaultView,
  toggleAutoUpdateChecker,
  toggleDisplayNotifications,
};

export default SettingsAPI;
