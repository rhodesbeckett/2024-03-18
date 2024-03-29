import type { MenuItemConstructorOptions } from 'electron';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Keybinding from 'react-keybinding-component';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';

import TrackRow from '../TrackRow/TrackRow';
import TracksListHeader from '../TracksListHeader/TracksListHeader';
import PlaylistsAPI from '../../stores/PlaylistsAPI';
import {
  isLeftClick,
  isRightClick,
  isCtrlKey,
  isAltKey,
} from '../../lib/utils-events';
import {
  Config,
  PlaylistModel,
  TrackModel,
} from '../../../shared/types/museeks';
import { usePlayerAPI } from '../../stores/usePlayerStore';
import useLibraryStore, { useLibraryAPI } from '../../stores/useLibraryStore';

import styles from './TracksList.module.css';

const { menu } = window.ElectronAPI;

const ROW_HEIGHT = 30;
const ROW_HEIGHT_COMPACT = 24;

// --------------------------------------------------------------------------
// TrackList
// --------------------------------------------------------------------------

type Props = {
  type: string;
  tracks: TrackModel[];
  tracksDensity: Config['tracksDensity'];
  trackPlayingID: string | null;
  playlists: PlaylistModel[];
  currentPlaylist?: string;
  reorderable?: boolean;
  onReorder?: (
    playlistID: string,
    tracksIDs: string[],
    targetTrackID: string,
    position: 'above' | 'below',
  ) => void;
};

export default function TracksList(props: Props) {
  const {
    tracks,
    type,
    tracksDensity,
    trackPlayingID,
    reorderable,
    currentPlaylist,
    onReorder,
    playlists,
  } = props;

  const [selected, setSelected] = useState<string[]>([]);
  const [reordered, setReordered] = useState<string[] | null>([]);
  const navigate = useNavigate();

  // Scrollable element for the virtual list + virtualizer
  const scrollableRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tracks.length,
    overscan: 10,
    getScrollElement: () => scrollableRef.current,
    estimateSize: () => {
      switch (tracksDensity) {
        case 'compact':
          return ROW_HEIGHT_COMPACT;
        case 'normal':
        default:
          return ROW_HEIGHT;
      }
    },
    getItemKey: (index) => tracks[index]._id,
  });

  const playerAPI = usePlayerAPI();
  const libraryAPI = useLibraryAPI();
  const highlight = useLibraryStore((state) => state.highlightPlayingTrack);

  // Highlight playing track and scroll to it
  // Super-mega-hacky to use Redux for that
  useEffect(() => {
    if (highlight === true && trackPlayingID) {
      setSelected([trackPlayingID]);

      const playingTrackIndex = tracks.findIndex(
        (track) => track._id === trackPlayingID,
      );

      if (playingTrackIndex >= 0) {
        virtualizer.scrollToIndex(playingTrackIndex, { behavior: 'smooth' });
      }

      libraryAPI.highlightPlayingTrack(false);
    }
  }, [highlight, trackPlayingID, tracks, libraryAPI, virtualizer]);

  /**
   * Helpers
   */
  const startPlayback = useCallback(
    async (trackID: string) => {
      playerAPI.start(tracks, trackID);
    },
    [tracks, playerAPI],
  );

  /**
   * Keyboard navigations events/helpers
   */
  const onEnter = useCallback(
    async (index: number, tracks: TrackModel[]) => {
      if (index !== -1) playerAPI.start(tracks, tracks[index]._id);
    },
    [playerAPI],
  );

  const onControlAll = useCallback((tracks: TrackModel[]) => {
    setSelected(tracks.map((track) => track._id));
  }, []);

  const onUp = useCallback(
    (index: number, tracks: TrackModel[], shiftKeyPressed: boolean) => {
      const addedIndex = Math.max(0, index - 1);

      // Add to the selection if shift key is pressed
      let newSelected = selected;

      if (shiftKeyPressed) newSelected = [tracks[addedIndex]._id, ...selected];
      else newSelected = [tracks[addedIndex]._id];

      setSelected(newSelected);
      virtualizer.scrollToIndex(addedIndex);
    },
    [selected, virtualizer],
  );

  const onDown = useCallback(
    (index: number, tracks: TrackModel[], shiftKeyPressed: boolean) => {
      const addedIndex = Math.min(tracks.length - 1, index + 1);

      // Add to the selection if shift key is pressed
      let newSelected = selected;
      if (shiftKeyPressed) newSelected = [...selected, tracks[addedIndex]._id];
      else newSelected = [tracks[addedIndex]._id];

      setSelected(newSelected);
      virtualizer.scrollToIndex(addedIndex);
    },
    [selected, virtualizer],
  );

  const onKey = useCallback(
    async (e: KeyboardEvent) => {
      let firstSelectedTrackID = tracks.findIndex((track) =>
        selected.includes(track._id),
      );

      switch (e.code) {
        case 'KeyA':
          if (isCtrlKey(e)) {
            onControlAll(tracks);
            e.preventDefault();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          onUp(firstSelectedTrackID, tracks, e.shiftKey);
          break;

        case 'ArrowDown':
          // This effectively becomes lastSelectedTrackID
          firstSelectedTrackID = tracks.findIndex(
            (track) => selected[selected.length - 1] === track._id,
          );
          e.preventDefault();
          onDown(firstSelectedTrackID, tracks, e.shiftKey);
          break;

        case 'Enter':
          e.preventDefault();
          await onEnter(firstSelectedTrackID, tracks);
          break;

        default:
          break;
      }
    },
    [onControlAll, onDown, onUp, onEnter, selected, tracks],
  );

  /**
   * Playlists re-order events handlers
   */
  const onReorderStart = useCallback(() => setReordered(selected), [selected]);
  const onReorderEnd = useCallback(() => setReordered(null), []);

  const onDrop = useCallback(
    async (targetTrackID: string, position: 'above' | 'below') => {
      if (onReorder && currentPlaylist && reordered) {
        onReorder(currentPlaylist, reordered, targetTrackID, position);
      }
    },
    [currentPlaylist, onReorder, reordered],
  );

  /**
   * Tracks selection
   */
  const isSelectableTrack = useCallback(
    (id: string) => !selected.includes(id),
    [selected],
  );

  const sortSelected = useCallback(
    (a: string, b: string): number => {
      const allTracksIDs = tracks.map((track) => track._id);

      return allTracksIDs.indexOf(a) - allTracksIDs.indexOf(b);
    },
    [tracks],
  );

  const toggleSelectionByID = useCallback(
    (id: string) => {
      let newSelected = [...selected];

      if (newSelected.includes(id)) {
        // remove track
        newSelected.splice(newSelected.indexOf(id), 1);
      } else {
        // add track
        newSelected.push(id);
      }

      newSelected = newSelected.sort(sortSelected);
      setSelected(newSelected);
    },
    [selected, sortSelected],
  );

  const multiSelect = useCallback(
    (index: number) => {
      const selectedInt = [];

      // Prefer destructuring
      for (let i = 0; i < tracks.length; i++) {
        if (selected.includes(tracks[i]._id)) {
          selectedInt.push(i);
        }
      }

      let base;
      const min = Math.min(...selectedInt);
      const max = Math.max(...selectedInt);

      if (index < min) {
        base = max;
      } else {
        base = min;
      }

      const newSelected = [];

      if (index < min) {
        for (let i = 0; i <= Math.abs(index - base); i++) {
          newSelected.push(tracks[base - i]._id);
        }
      } else if (index > max) {
        for (let i = 0; i <= Math.abs(index - base); i++) {
          newSelected.push(tracks[base + i]._id);
        }
      }

      setSelected(newSelected.sort(sortSelected));
    },
    [selected, sortSelected, tracks],
  );

  const selectTrack = useCallback(
    (event: React.MouseEvent, trackID: string, index: number) => {
      // To allow selection drag-and-drop, we need to prevent track selection
      // when selection a track that is already selected
      if (
        selected.includes(trackID) &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey
      ) {
        return;
      }

      if (
        isLeftClick(event) ||
        (isRightClick(event) && isSelectableTrack(trackID))
      ) {
        if (isCtrlKey(event)) {
          toggleSelectionByID(trackID);
        } else if (event.shiftKey) {
          if (selected.length === 0) {
            const newSelected = [trackID];
            setSelected(newSelected);
          } else {
            multiSelect(index);
          }
        } else {
          if (!isAltKey(event)) {
            const newSelected = [trackID];
            setSelected(newSelected);
          }
        }
      }
    },
    [selected, multiSelect, toggleSelectionByID, isSelectableTrack],
  );

  const selectTrackClick = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent, trackID: string) => {
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        selected.includes(trackID)
      ) {
        setSelected([trackID]);
      }
    },
    [selected],
  );

  /**
   * Context menus
   */
  const showContextMenu = useCallback(
    (_e: React.MouseEvent, index: number) => {
      const selectedCount = selected.length;
      const track = tracks[index];
      let shownPlaylists = playlists;

      // Hide current playlist if needed
      if (type === 'playlist') {
        shownPlaylists = playlists.filter(
          (elem) => elem._id !== currentPlaylist,
        );
      }

      const playlistTemplate: MenuItemConstructorOptions[] = [];
      let addToQueueTemplate: MenuItemConstructorOptions[] = [];

      if (shownPlaylists) {
        playlistTemplate.push(
          {
            label: 'Create new playlist...',
            click: async () => {
              await PlaylistsAPI.create('New playlist', selected);
            },
          },
          {
            type: 'separator',
          },
        );

        if (shownPlaylists.length === 0) {
          playlistTemplate.push({
            label: 'No playlists',
            enabled: false,
          });
        } else {
          shownPlaylists.forEach((playlist) => {
            playlistTemplate.push({
              label: playlist.name,
              click: async () => {
                await PlaylistsAPI.addTracks(playlist._id, selected);
              },
            });
          });
        }
      }

      addToQueueTemplate = [
        {
          label: 'Add to queue',
          click: async () => {
            playerAPI.addInQueue(selected);
          },
        },
        {
          label: 'Play next',
          click: async () => {
            playerAPI.addNextInQueue(selected);
          },
        },
        {
          type: 'separator',
        },
      ];

      const template: MenuItemConstructorOptions[] = [
        {
          label:
            selectedCount > 1
              ? `${selectedCount} tracks selected`
              : `${selectedCount} track selected`,
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
      ];

      for (const artist of track.artist) {
        template.push({
          label: `Search for "${artist}" `,
          click: () => {
            libraryAPI.search(track.artist[0]);
          },
        });
      }

      template.push({
        label: `Search for "${track.album}"`,
        click: () => {
          libraryAPI.search(track.album);
        },
      });

      if (type === 'playlist' && currentPlaylist) {
        template.push(
          {
            type: 'separator',
          },
          {
            label: 'Remove from playlist',
            click: async () => {
              await PlaylistsAPI.removeTracks(currentPlaylist, selected);
            },
          },
        );
      }

      template.push(
        {
          type: 'separator',
        },
        {
          label: 'Edit track',
          click: () => {
            navigate(`/details/${track._id}`);
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Show in file manager',
          click: () => {
            window.MuseeksAPI.library.showTrackInFolder(track);
          },
        },
        {
          label: 'Remove from library',
          click: () => {
            libraryAPI.remove(selected);
          },
        },
      );

      menu.showContextMenu(template);
    },
    [
      currentPlaylist,
      playlists,
      selected,
      tracks,
      type,
      navigate,
      playerAPI,
      libraryAPI,
    ],
  );

  return (
    <div className={styles.tracksList}>
      <Keybinding onKey={onKey} preventInputConflict />
      <TracksListHeader enableSort={type === 'library'} />
      {/* Scrollable element */}
      <div ref={scrollableRef} className={styles.tracksListScroller}>
        {/* The large inner element to hold all of the items */}
        <div
          className={styles.tracksListRows}
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Only the visible items in the virtualizer, manually positioned to be in view */}
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const track = tracks[virtualItem.index];
            return (
              <TrackRow
                key={virtualItem.key}
                selected={selected.includes(track._id)}
                track={track}
                isPlaying={trackPlayingID === track._id}
                index={virtualItem.index}
                onMouseDown={selectTrack}
                onClick={selectTrackClick}
                onContextMenu={showContextMenu}
                onDoubleClick={startPlayback}
                draggable={reorderable}
                reordered={
                  (reordered && reordered.includes(track._id)) || false
                }
                onDragStart={onReorderStart}
                onDragEnd={onReorderEnd}
                onDrop={onDrop}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
