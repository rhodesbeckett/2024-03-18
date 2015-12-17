import AppDispatcher from '../dispatcher/AppDispatcher';
import AppConstants  from '../constants/AppConstants';

import app from '../constants/app.js';

import mmd      from 'musicmetadata';
import fs       from 'fs';
import path     from 'path';
import mime     from 'mime';
import walkSync from 'walk-sync';

import remote from 'remote';

var globalShortcut = remote.require('global-shortcut');
var dialog         = remote.require('dialog');



var AppActions = {

    init: function() {

        // Usual tasks
        this.app.start();
        this.getTracks();
        this.settings.checkTheme();
        this.settings.checkDevMode();
        this.app.initShortcuts();

        // Prevent some events
        window.addEventListener('dragover', function (e) {
            e.preventDefault();
        }, false);

        window.addEventListener('drop', function (e) {
            e.preventDefault();
        }, false);

        // Remember dimensions and positionning
        var currentWindow = app.browserWindows.main;

        currentWindow.on('resize', function() {
            AppActions.app.saveBounds();
        });

        currentWindow.on('move', function() {
            AppActions.app.saveBounds();
        });
    },

    /**
     * Refresh the library
     */
    getTracks: function() {
        app.db.find({}).sort({ 'lArtist': 1, 'year': 1, 'album': 1, 'disk': 1, 'track.no': 1 }).exec(function (err, tracks) {
            if (err) throw err;
            else {
                AppDispatcher.dispatch({
                    actionType : AppConstants.APP_REFRESH_LIBRARY,
                    tracks     : tracks
                });
            }
        });
    },

    /**
     * Select and play a track
     */
    selectAndPlay: function(id) {

        AppDispatcher.dispatch({
            actionType : AppConstants.APP_SELECT_AND_PLAY,
            id         : id
        });
    },

    /**
     * Search
     */
    filterSearch: function(search) {

        AppDispatcher.dispatch({
            actionType : AppConstants.APP_FILTER_SEARCH,
            search     : search
        });
    },

    app: {

        start: function() {
            var bounds        = app.initialConfig.bounds;
            var currentWindow = app.browserWindows.main;
            currentWindow.setBounds(bounds);
            currentWindow.show();
        },

        close: function() {
            app.browserWindows.main.close();
        },

        saveBounds: function() {

            var self = AppActions;
            var now = window.performance.now();

            if (now - self.lastFilterSearch < 250) {
                clearTimeout(self.filterSearchTimeOut);
            }

            self.lastFilterSearch = now;

            self.filterSearchTimeOut = setTimeout(() => {

                var currentWindow = app.browserWindows.main;
                var config        = JSON.parse(localStorage.getItem('config'));
                    config.bounds = currentWindow.getBounds();

                localStorage.setItem('config', JSON.stringify(config));
            }, 250);
        },

        initShortcuts: function() {

            // Global shortcuts
            globalShortcut.register('MediaPlayPause', function () {
                AppActions.player.playToggle();
            });

            globalShortcut.register('MediaPreviousTrack', function () {
                AppActions.player.previous();
            });

            globalShortcut.register('MediaNextTrack', function () {
                AppActions.player.next();
            });
        }
    },

    player: {

        toggle: function() {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_PLAYER_TOGGLE
            });
        },

        play: function() {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_PLAYER_PLAY
            });
        },

        pause: function() {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_PLAYER_PAUSE
            });
        },

        stop: function() {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_PLAYER_STOP
            });
        },

        next: function(e) {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_PLAYER_NEXT,
                e          : e
            });
        },

        previous: function() {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_PLAYER_PREVIOUS
            });
        },

        shuffle: function() {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_PLAYER_SHUFFLE
            });
        },

        setVolume: function(volume) {
            app.audio.volume = volume;
            var config = JSON.parse(localStorage.getItem('config'));
                config.volume = volume;

            localStorage.setItem('config', JSON.stringify(config));
        },

        repeat: function() {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_PLAYER_REPEAT
            });
        },

        jumpTo: function(to) {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_PLAYER_JUMP_TO,
                to         : to
            });
        }
    },

    queue: {

        clear: function() {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_QUEUE_CLEAR
            });
        },

        remove: function(index) {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_QUEUE_REMOVE,
                index      : index
            });
        },

        add: function(selected) {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_QUEUE_ADD,
                selected   : selected
            });
        },

        addNext: function(selected) {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_QUEUE_ADD_NEXT,
                selected   : selected
            });
        },

        setPlaylist: function(playlist) {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_QUEUE_SET_PLAYLIST,
                playlist   : playlist
            });
        }
    },

    library: {

        addFolders(folders) {

            var folders = dialog.showOpenDialog({ properties: ['openDirectory', 'multiSelections']});

            if(folders !== undefined) {
                AppDispatcher.dispatch({
                    actionType : AppConstants.APP_LIBRARY_ADD_FOLDERS,
                    folders    : folders
                });
            }
        },

        removeFolder(index) {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_LIBRARY_REMOVE_FOLDER,
                index      : index
            });
        },

        reset() {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_LIBRARY_REFRESH_START,
            });

            app.db.remove({ }, { multi: true }, function (err, numRemoved) {
                app.db.loadDatabase(function (err) {
                    if(err) {
                        throw err
                    } else {
                        AppActions.getTracks();
                        AppDispatcher.dispatch({
                            actionType : AppConstants.APP_LIBRARY_REFRESH_END,
                        });
                    }
                });
            });
        },

        refresh() {

            var folders = JSON.parse(localStorage.getItem('config')).musicFolders;

            AppDispatcher.dispatch({
                actionType : AppConstants.APP_LIBRARY_REFRESH_START
            });

            // Start the big thing
            app.db.remove({ }, { multi: true }, function (err, numRemoved) {
                app.db.loadDatabase(function (err) {
                    if(err) throw err;
                    else {

                        var filesList = [];

                        // Loop through folders
                        folders.forEach(function(folder, index, folders) {
                            // Get the list of files
                            filesList = filesList.concat(walkSync(folder, { directories: false }).map((d) =>  path.join(folder, d)));
                        });

                        var filesListFiltered = [];

                        // Get the metadatas of all the files
                        filesList.forEach((file, i) => {
                            if(app.supportedFormats.indexOf(mime.lookup(file)) > -1) filesListFiltered.push(file);
                        });

                        // Fake sync async loop
                        (function forloop(i){
                            if(i < filesListFiltered.length) {

                                var file   = filesListFiltered[i];
                                var stream = fs.createReadStream(file);

                                // store in DB here
                                mmd(stream, { duration: true }, function (err, metadata) {

                                    AppActions.settings.refreshProgress(parseInt(i * 100 / filesListFiltered.length));

                                    forloop(i + 1);
                                    if (err) console.warn('An error occured while reading ' + file + ' id3 tags: ' + err);

                                    delete metadata.picture;
                                    metadata.path = file;
                                    metadata.lArtist = metadata.artist.length === 0 ? ['unknown artist'] : metadata.artist[0].toLowerCase();

                                    if(metadata.artist.length === 0) metadata.artist = ['Unknown artist'];
                                    if(metadata.album === null || metadata.album === '') metadata.album = 'Unknown';
                                    if(metadata.title === null || metadata.title === '') metadata.title = path.parse(file).base;
                                    if(metadata.duration == '') metadata.duration = 0;

                                    // Let's insert in the data
                                    app.db.insert(metadata, function (err, newDoc) {
                                        if(err) throw err;
                                        if(i === filesListFiltered.length - 1) {
                                            AppActions.getTracks();
                                            AppDispatcher.dispatch({
                                                actionType : AppConstants.APP_LIBRARY_REFRESH_END
                                            });
                                        }
                                    });
                                });
                            }
                        })(0);
                    }
                });
            });
        }
    },

    settings: {

        checkTheme: function() {
            var themeName = JSON.parse(localStorage.getItem('config')).theme;
            document.querySelector('body').classList.add('theme-' + themeName);
        },

        toggleDarkTheme: function() {

            var config   = JSON.parse(localStorage.getItem('config'));

            var theme = config.theme === 'light' ? 'dark' : 'light';

            document.querySelector('body').classList.remove('theme-' + config.theme);
            document.querySelector('body').classList.add('theme-' + theme);

            config.theme = theme;

            localStorage.setItem('config', JSON.stringify(config));

            AppDispatcher.dispatch({
                actionType : AppConstants.APP_REFRESH_CONFIG
            });
        },

        checkDevMode: function() {
            if(JSON.parse(localStorage.getItem('config')).devMode) app.browserWindows.main.openDevTools();
        },

        toggleDevMode: function() {

            var config  = JSON.parse(localStorage.getItem('config'));

            config.devMode = !config.devMode;

            // Open dev tools if needed
            if(config.devMode) app.browserWindows.main.openDevTools();
            else app.browserWindows.main.closeDevTools();

            localStorage.setItem('config', JSON.stringify(config));

            AppDispatcher.dispatch({
                actionType : AppConstants.APP_REFRESH_CONFIG
            });
        },

        refreshProgress: function(percentage) {
            AppDispatcher.dispatch({
                actionType : AppConstants.APP_LIBRARY_REFRESH_PROGRESS,
                percentage : percentage
            });
        }
    }
};

export default AppActions;
