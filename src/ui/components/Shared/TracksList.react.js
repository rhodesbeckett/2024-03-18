import electron from 'electron';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import KeyBinding from 'react-keybinding-component';

import TrackRow from './TrackRow.react';
import PlayingIndicator from './PlayingIndicator.react';
import CustomScrollbar from './CustomScrollbar.react';
import TracksListHeader from './TracksListHeader.react';

import * as LibraryActions from '../../actions/LibraryActions';
import * as PlaylistsActions from '../../actions/PlaylistsActions';
import * as PlayerActions from '../../actions/PlayerActions';
import * as QueueActions from '../../actions/QueueActions';

import Player from '../../lib/player';
import * as utils from '../../utils/utils';
import { isCtrlKey } from '../../utils/utils-platform';

const { shell, remote } = electron;
const { Menu } = remote;


/*
|--------------------------------------------------------------------------
| Child - ArtistList
|--------------------------------------------------------------------------
*/

export default class TracksList extends Component {
  static propTypes = {
    type: PropTypes.string.isRequired,
    tracks: PropTypes.array,
    trackPlayingId: PropTypes.string,
    playlists: PropTypes.array,
    currentPlaylist: PropTypes.string,
    playerStatus: PropTypes.string,
  }

  constructor(props) {
    super(props);
    this.state = {
      selected  : [],
      scrollTop : 0,
    };

    this.showContextMenu  = this.showContextMenu.bind(this);
    this.startPlayback    = this.startPlayback.bind(this);
    this.scrollTracksList = this.scrollTracksList.bind(this);
    this.selectTrack      = this.selectTrack.bind(this);
    this.onKey            = this.onKey.bind(this);

    this.rowHeight = 30;
  }

  componentDidMount() {
    this.renderView = document.querySelector('.tracks-list-render-view');
  }

  scrollTracksList() {
    this.setState({ scrollTop : this.renderView.scrollTop });
  }

  selectTrack(e, id, index) {
    if(this.isLeftClick(e) || (this.isRightClick(e) && this.isSelectableTrack(id))) {
      if(isCtrlKey(e.nativeEvent)) {
        this.toggleSelectionById(id);
      } else if (e.shiftKey) {
        if (this.state.selected.length === 0) {
          const selected = [id];
          this.setState({ selected });
        } else this.multiSelect(e, id, index);
      } else {
        const selected = [id];
        this.setState({ selected });
      }
    }
  }

  onKey(e) {
    const selected = this.state.selected;
    const tracks   = this.props.tracks;

    const firstSelectedTrackIdx = tracks.findIndex((track) => {
      return selected.includes(track._id);
    });

    switch(e.keyCode) {
      case 38: // up
        e.preventDefault();
        this.onUp(firstSelectedTrackIdx, tracks);
        break;

      case 40: // down
        e.preventDefault();
        this.onDown(firstSelectedTrackIdx, tracks);
        break;

      case 13: // enter
        e.preventDefault();
        this.onEnter(firstSelectedTrackIdx, tracks);
        break;
    }
  }

  isLeftClick(e) {
    return e.button === 0;
  }

  isRightClick(e) {
    return e.button === 2;
  }

  isSelectableTrack(id) {
    return !this.state.selected.includes(id);
  }

  getTrackTiles() {
    const { selected } = this.state;
    const { trackPlayingId, tracks } = this.props;

    const chunkLength = 20;
    const tilesToDisplay = 5;
    const tileHeight = this.rowHeight * chunkLength;

    const tracksChunked = utils.chunkArray(tracks, chunkLength);
    const tilesScrolled = Math.floor(this.state.scrollTop / tileHeight);

    return tracksChunked.splice(tilesScrolled, tilesToDisplay).map((tracksChunk, indexChunk) => {
      const list = tracksChunk.map((track, index) => {
        const trackRowIndex = (tilesScrolled + indexChunk) * chunkLength + index;

        let playingIndicator = undefined;

        if(trackPlayingId === track._id) {
          playingIndicator = <PlayingIndicator state={this.pausePlayState()} />;
        }

        return(
          <TrackRow
            selected={selected.includes(track._id)}
            trackId={track._id}
            key={`track-${track._id}`}
            index={trackRowIndex}
            onMouseDown={this.selectTrack}
            onContextMenu={this.showContextMenu}
            onDoubleClick={this.startPlayback}
          >
            <div className='cell cell-track-playing text-center'>
              { playingIndicator }
            </div>
            <div className='cell cell-track'>
              { track.title }
            </div>
            <div className='cell cell-duration'>
              { utils.parseDuration(track.duration) }
            </div>
            <div className='cell cell-artist'>
              { track.artist[0] }
            </div>
            <div className='cell cell-album'>
              { track.album }
            </div>
            <div className='cell cell-genre'>
              { track.genre.join(', ') }
            </div>
          </TrackRow>
        );
      });

      const translationDistance = (tilesScrolled * this.rowHeight * chunkLength) +
                                      (indexChunk * this.rowHeight * chunkLength);
      const tracksListTileStyles = {
        transform: `translate3d(0, ${translationDistance}px, 0)`,
      };

      return (
        <div className='tracks-list-tile' key={indexChunk} style={tracksListTileStyles}>
          { list }
        </div>
      );
    });
  }

  pausePlayState() {
    return Player.isPaused() ? 'pause' : 'play';
  }

  toggleSelectionById(id) {
    let selected = [...this.state.selected];

    if(selected.includes(id)) {
      // remove track
      selected.splice(selected.indexOf(id), 1);
    } else {
      // add track
      selected.push(id);
    }

    selected = utils.simpleSort(selected, 'asc');
    this.setState({ selected });
  }

  multiSelect(e, id, index) {
    const tracks = this.props.tracks;
    const selected = this.state.selected;

    const selectedInt = [];

    for(let i = 0, length = tracks.length; i < length; i++) {
      if(selected.includes(tracks[i]._id)) {
        selectedInt.push(i);
      }
    }

    let base;
    const min = Math.min(...selectedInt);
    const max = Math.max(...selectedInt);

    if(index < min) {
      base = max;
    } else {
      base = min;
    }

    const newSelected = [];

    if(index < min) {
      for(let i = 0; i <= Math.abs(index - base); i++) {
        newSelected.push(tracks[base - i]._id);
      }
    } else if(index > max) {
      for(let i = 0; i <= Math.abs(index - base); i++) {
        newSelected.push(tracks[base + i]._id);
      }
    }

    this.setState({ selected : newSelected });
  }

  onUp(i, tracks) {
    if(i - 1 >= 0) {
      this.setState({ selected : tracks[i - 1]._id }, () => {
        const container = document.querySelector('.tracks-list .tracks-list-render-view');
        const nodeOffsetTop = (i - 1) * this.rowHeight;

        if(container.scrollTop > nodeOffsetTop) container.scrollTop = nodeOffsetTop;
      });
    }
  }

  onDown(i, tracks) {
    if(i + 1 < tracks.length) {
      this.setState({ selected : tracks[i + 1]._id }, () => {
        const container = document.querySelector('.tracks-list .tracks-list-render-view');
        const nodeOffsetTop = (i + 1) * this.rowHeight;

        if(container.scrollTop + container.offsetHeight <= nodeOffsetTop) {
          container.scrollTop = nodeOffsetTop - container.offsetHeight + this.rowHeight;
        }
      });
    }
  }

  onEnter(i, tracks) {
    if(i !== undefined) PlayerActions.start(tracks, tracks[i]._id);
  }

  showContextMenu(e, index) {
    const { type, playerStatus } = this.props;
    const { selected } = this.state;
    const selectedCount = selected.length;
    const track = this.props.tracks[index];


    let playlists = [...this.props.playlists];

    // Hide current playlist if needed
    if(this.props.type === 'playlist') {
      playlists = playlists.filter((elem) => elem._id !== this.props.currentPlaylist);
    }

    const playlistTemplate = [];
    let addToQueueTemplate = [];

    if (playlists) {
      playlistTemplate.push(
        {
          label: 'Create new playlist...',
          click: async () => {
            const playlistId = await PlaylistsActions.create('New playlist', false);
            PlaylistsActions.addTracksTo(playlistId, selected);
          },
        },
        {
          type: 'separator',
        },
      );

      if(playlists.length > 0) {
        playlistTemplate.push(
          {
            label: 'No playlist',
            enabled: false,
          },
        );
      } else {
        playlists.forEach((playlist) => {
          playlistTemplate.push({
            label: playlist.name,
            click: () => {
              PlaylistsActions.addTracksTo(playlist._id, selected);
            },
          });
        });
      }
    }

    if(playerStatus !== 'stop') {
      addToQueueTemplate = [
        {
          label: 'Add to queue',
          click: () => {
            QueueActions.addAfter(selected);
          },
        },
        {
          label: 'Play next',
          click: () => {
            QueueActions.addNext(selected);
          },
        },
        {
          type: 'separator',
        },
      ];
    }

    const template = [
      {
        label: selectedCount > 1 ? `${selectedCount} tracks selected` : `${selectedCount} track selected`,
        enabled: false,
      },
      {
        type: 'separator',
      },
      ...addToQueueTemplate,
      {
        label: 'Add to playlist',
        submenu: playlistTemplate,
      },
      {
        type: 'separator',
      },
      {
        label: `Search for "${track.artist[0]}" `,
        click: () => {
          // HACK
          const searchInput = document.querySelector('input[type="text"].search');
          searchInput.value = track.artist[0];
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        },
      },
      {
        label: `Search for "${track.album}"`,
        click: () => {
          // HACK
          const searchInput = document.querySelector('input[type="text"].search');
          searchInput.value = track.album;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        },
      },
    ];

    if(type === 'playlist') template.push(
      {
        type: 'separator',
      },
      {
        label: 'Remove from playlist',
        click: () => {
          PlaylistsActions.removeTracks(this.props.currentPlaylist, selected);
        },
      }
    );

    template.push(
      {
        type: 'separator',
      },
      {
        label: 'Show in file manager',
        click: () => {
          shell.showItemInFolder(track.path);
        },
      },
      {
        label: 'Remove from library',
        click: () => {
          LibraryActions.remove(selected);
        },
      }
    );

    const context = Menu.buildFromTemplate(template);

    context.popup(this.window, { async: true }); // Let it appear
  }

  startPlayback(_id) {
    PlayerActions.start(this.props.tracks, _id);
  }

  render() {
    const { tracks, type } = this.props;

    return (
      <div className='tracks-list'> {/* there used to be a tabIndex={ 0 }, I don't remember why */}
        <KeyBinding onKey={this.onKey} preventInputConflict />
        <TracksListHeader enableSort={type === 'library'} />
        <CustomScrollbar
          className='tracks-list-body'
          onScroll={this.scrollTracksList}
        >
          <div className='tracks-list-tiles' style={{ height : tracks.length * this.rowHeight }}>
            { this.getTrackTiles() }
          </div>
        </CustomScrollbar>
      </div>
    );
  }
}
