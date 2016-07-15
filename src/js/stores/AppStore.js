/*
|--------------------------------------------------------------------------
| Requires
|--------------------------------------------------------------------------
*/

import { EventEmitter } from 'events';
import objectAssign     from 'object-assign';
import path             from 'path';
import fs               from 'fs';

import app from '../utils/app';

import AppDispatcher from '../dispatcher/AppDispatcher';
import AppConstants  from '../constants/AppConstants';

import utils from '../utils/utils';

const CHANGE_EVENT = 'change';



/*
|--------------------------------------------------------------------------
| Store
|--------------------------------------------------------------------------
*/

let AppStore = objectAssign({}, EventEmitter.prototype, {

    library           :  null,  // All tracks

    tracks            :  {
        all: null,              // All tracks shown on the library view
        playlist: null          // Tracks shown in the playlist view (to avoid too much reloads)
    },
    tracksCursor      : 'all',  // 'all' or 'playlist'

    queue             :  [],    // Tracks to be played
    queueCursor       :  null,  // The cursor of the queue

    oldQueue          :  null,  // Queue backup
    oldQueueCursor    :  null,  // The last cursor backup (to roll stuff back, e.g. unshuffle)

    playlists         :  null,

    playerStatus      : 'stop', // Player status
    notifications     :  [],    // The array of notifications
    refreshingLibrary :  false, // If the app is currently refreshing the app
    repeat            :  false, // the current repeat state (one, all, false)
    shuffle           :  false, // If shuffle mode is enabled
    refreshProgress   :  0,     // Progress of the refreshing library

    getStore: function() {
        return {
            config            : app.config.getAll(),
            notifications     : this.notifications,
            library           : this.library,
            tracks            : this.tracks[this.tracksCursor],
            playlists         : this.playlists,
            queue             : this.queue,
            queueCursor       : this.queueCursor,
            playerStatus      : this.playerStatus,
            notifications     : this.notifications,
            refreshingLibrary : this.refreshingLibrary,
            repeat            : this.repeat,
            shuffle           : this.shuffle,
            refreshProgress   : this.refreshProgress
        };
    },

    addChangeListener: function(cb) {
        this.on(CHANGE_EVENT, cb);
    },

    removeChangeListener: function(cb) {
        this.removeListener(CHANGE_EVENT, cb);
    }
});

export default AppStore;



/*
|--------------------------------------------------------------------------
| Dispatcher Listener
|--------------------------------------------------------------------------
*/

AppDispatcher.register(function(payload) {

    switch(payload.actionType) {

        case(AppConstants.APP_REFRESH_LIBRARY):
            var tracks = payload.tracks;
            AppStore.library = tracks;
            AppStore.tracks.all = tracks;
            AppStore.tracks.playlist = [];
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_REFRESH_CONFIG):
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_SELECT_AND_PLAY):

            var queue       = [].concat(AppStore.tracks[AppStore.tracksCursor]);
            var id          = payload._id;
            var queueCursor = null; // Clean that variable mess later
            var oldQueue    = queue;

            var queuePosition = null;

            for(var i = 0, length = queue.length; i < length; i++) {

                if(queue[i]._id === id) {
                    queuePosition = i;
                    queueCursor = i;
                    break;
                }
            }

            if(queuePosition !== null) {

                var uri = utils.parseURI(queue[queuePosition].path);
                    app.audio.src = uri;
                    app.audio.play();

                // Check if we have to shuffle the queue
                if(AppStore.shuffle) {

                    var index = 0;

                    // need to check that later
                    for(var i = 0, length = queue.length; i < length; i++) {

                        if(queue[i]._id === id) {
                            index = i;
                            break;
                        }
                    }

                    var firstTrack = queue[index];

                    queue.splice(id, 1);

                    var m = queue.length, t, i;
                    while (m) {

                        // Pick a remaining element…
                        i = Math.floor(Math.random() * m--);

                        // And swap it with the current element.
                        t = queue[m];
                        queue[m] = queue[i];
                        queue[i] = t;
                    }

                    queue.unshift(firstTrack);

                    // Let's set the cursor to 0
                    queueCursor = 0;
                }

                // Backup that and change the UI
                AppStore.playerStatus   = 'play';
                AppStore.queue          =  queue;
                AppStore.queueCursor    =  queueCursor;
                AppStore.oldQueue       =  queue;
                AppStore.oldQueueCursor =  queueCursor;
                AppStore.emit(CHANGE_EVENT);
            }

            break;

        case(AppConstants.APP_FILTER_SEARCH):

            if(search != '' && search != undefined) {

                AppStore.tracks.all = AppStore.library;

            } else {

                var search = utils.stripAccents(payload.search);
                var tracks = AppStore.library.filter((track) => { // Problem here
                    return track.loweredMetas.artist.join(', ').includes(search)
                        || track.loweredMetas.album.includes(search)
                        || track.loweredMetas.genre.join(', ').includes(search)
                        || track.loweredMetas.title.includes(search);
                });

                AppStore.tracks.all = tracks;
            }

            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYER_TOGGLE):
            if(app.audio.paused && AppStore.queue !== null) {
                AppStore.playerStatus = 'play';
                app.audio.play();
            } else {
                AppStore.playerStatus = 'pause';
                app.audio.pause();
            }
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYER_PLAY):
            if(AppStore.queue !== null) {
                AppStore.playerStatus = 'play';
                app.audio.play();
                AppStore.emit(CHANGE_EVENT);
            }
            break;

        case(AppConstants.APP_PLAYER_PAUSE):
            AppStore.playerStatus = 'pause';
            app.audio.pause();
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYER_STOP):
            app.audio.pause();
            AppStore.library        =  null;
            AppStore.tracks         =  { all: null, playlist: null };
            AppStore.queue          =  [];
            AppStore.queueCursor    =  null;
            AppStore.oldQueueCursor =  null;
            AppStore.playerStatus   = 'stop'
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYER_NEXT):

            var queue = AppStore.queue;

            if(AppStore.repeat === 'one') {
                newQueueCursor = AppStore.queueCursor;
            } else if (
                AppStore.repeat === 'all' &&
                AppStore.queueCursor === queue.length - 1 // is last track
            ) {
                newQueueCursor = 0; // start with new track
            } else {
                var newQueueCursor  = AppStore.queueCursor + 1;
            }


            if (queue[newQueueCursor] !== undefined) {

                var uri = utils.parseURI(queue[newQueueCursor].path); ;

                app.audio.src = uri;
                app.audio.play();
                AppStore.playerStatus = 'play';
                AppStore.queueCursor = newQueueCursor;

            } else {
                app.audio.pause();
                app.audio.src = '';
                AppStore.queue          =  [];
                AppStore.queueCursor    =  null;
                AppStore.oldQueueCursor =  null;
                AppStore.playerStatus   = 'stop'
                AppStore.emit(CHANGE_EVENT);
            }
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYER_PREVIOUS):

            var newQueueCursor = AppStore.queueCursor;

            // If track started less than 5 seconds ago, play th previous track, otherwise replay the current one
            if (app.audio.currentTime < 5) newQueueCursor = AppStore.queueCursor - 1;

            var newTrack = AppStore.queue[newQueueCursor];

            if (newTrack !== undefined) {

                var uri = utils.parseURI(newTrack.path);

                app.audio.src = uri;
                app.audio.play();
                AppStore.playerStatus = 'play';
                AppStore.queueCursor = newQueueCursor;

            } else {
                app.audio.pause();
                app.audio.src = '';
                AppStore.queue          =  [];
                AppStore.queueCursor    =  null;
                AppStore.oldQueueCursor =  null;
                AppStore.playerStatus   = 'stop'
                AppStore.emit(CHANGE_EVENT);
            }
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYER_SHUFFLE):

            if(!AppStore.shuffle) {

                AppStore.oldQueue       = AppStore.queue;
                AppStore.oldQueueCursor = AppStore.oldQueueCursor;

                // Let's shuffle that
                var queueCursor = AppStore.queueCursor;
                var queue       = AppStore.queue.slice();

                var firstTrack = queue[queueCursor]; // Get the current track

                queue = queue.splice(queueCursor + 1, AppStore.queue.length - (queueCursor + 1)); // now get only what we want

                var m = queue.length, t, i;
                while (m) {

                    // Pick a remaining element…
                    i = Math.floor(Math.random() * m--);

                    // And swap it with the current element.
                    t = queue[m];
                    queue[m] = queue[i];
                    queue[i] = t;
                }

                queue.unshift(firstTrack); // Add the current track at the first position

                AppStore.shuffle           = true;
                AppStore.queue          = queue;
                AppStore.queueCursor    = 0;
                AppStore.oldQueueCursor = queueCursor;

            } else {

                AppStore.queue       = AppStore.oldQueue;
                AppStore.queueCursor = AppStore.oldQueueCursor;
                AppStore.shuffle     = false;

            }

            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYER_REPEAT):
            var repeatState = AppStore.repeat;
            var newRepeatState;

            if(repeatState === 'all') {
                newRepeatState = 'one';
            } else if (repeatState === 'one') {
                newRepeatState = false;
            } else if (repeatState === false) {
                newRepeatState = 'all';
            }
            AppStore.repeat = newRepeatState;
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYER_JUMP_TO):
            app.audio.currentTime = payload.to;
            break;

        case(AppConstants.APP_QUEUE_PLAY):

            var queue       = AppStore.queue.slice();
            var queueCursor = payload.index;

            var uri = utils.parseURI(queue[queueCursor].path);
                app.audio.src = uri;
                app.audio.play();

            // Backup that and change the UI
            AppStore.playerStatus   = 'play';
            AppStore.queue          =  queue;
            AppStore.queueCursor    =  queueCursor;
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_QUEUE_CLEAR):
            AppStore.queue.splice(AppStore.queueCursor + 1, AppStore.queue.length - AppStore.queueCursor);
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_QUEUE_REMOVE):
            AppStore.queue.splice(AppStore.queueCursor + payload.index + 1, 1)
            AppStore.emit(CHANGE_EVENT);
            break;

        // Prob here
        case(AppConstants.APP_QUEUE_ADD):
            AppStore.queue = AppStore.queue.concat(payload.tracks);
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_QUEUE_ADD_NEXT):
            AppStore.queue.splice(AppStore.queueCursor + 1, 0, ...payload.tracks);
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_QUEUE_SET_QUEUE):
            AppStore.queue = payload.queue;
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_LIBRARY_ADD_FOLDERS):

            var musicFolders = app.config.get('musicFolders'),
                folders      = payload.folders;

            // Check if we reveived folders
            if(folders !== undefined) {
                // Add folders
                folders.forEach((folder) => {
                    musicFolders.push(fs.realpathSync(folder));
                });

                // Remove duplicates, useless children, ect...
                musicFolders = utils.removeUselessFolders(musicFolders);

                musicFolders.sort();

                app.config.set('musicFolders', musicFolders);
                app.config.saveSync();
                AppStore.emit(CHANGE_EVENT);
            }
            break;

        case(AppConstants.APP_LIBRARY_SET_TRACKSCURSOR):
            AppStore.tracksCursor = payload.cursor;
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_LIBRARY_REMOVE_FOLDER):
            var musicFolders = app.config.get('musicFolders');
            musicFolders.splice(payload.index, 1);
            app.config.set('musicFolders', musicFolders);
            app.config.saveSync();

            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_LIBRARY_RESET):
            // nothing here for the moment
            break;

        case(AppConstants.APP_LIBRARY_REFRESH_START):
            AppStore.status = 'An apple a day keeps Dr Dre away';
            AppStore.refreshingLibrary = true;
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_LIBRARY_REFRESH_END):
            AppStore.refreshingLibrary      = false;
            AppStore.refreshProgress = 0;
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_LIBRARY_REFRESH_PROGRESS):
            AppStore.refreshProgress = payload.percentage;
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_NOTIFICATION_ADD):
            AppStore.notifications.push(payload.notification);
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_NOTIFICATION_REMOVE):
            AppStore.notifications = AppStore.notifications.filter((elem) => {
                return elem._id !== payload._id;
            });
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYLISTS_REFRESH):
            var playlists = payload.playlists;
            AppStore.playlists = playlists;
            AppStore.emit(CHANGE_EVENT);
            break;

        case(AppConstants.APP_PLAYLISTS_LOAD_ONE):
            AppStore.tracks.playlist = payload.tracks;
            AppStore.emit(CHANGE_EVENT);
            break;
    }
});
