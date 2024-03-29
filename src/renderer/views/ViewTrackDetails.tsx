import React, { useCallback, useState } from 'react';
import {
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
} from 'react-router-dom';

// import Placeholder from '../shared/assets/placeholder.png';
// import * as coverUtils from '../../shared/lib/utils-cover';
import { TrackEditableFields } from '../../shared/types/museeks';
import * as Setting from '../components/Setting/Setting';
import Button from '../elements/Button/Button';
import { useLibraryAPI } from '../stores/useLibraryStore';

import { LoaderData } from './router';
import appStyles from './Root.module.css';
import styles from './ViewTrackDetails.module.css';

// We assume no artist or genre has a comma in its name (fingers crossed)
const DELIMITER = ',';

export default function ViewTrackDetails() {
  const { track } = useLoaderData() as DetailsLoaderData;

  const [formData, setFormData] = useState<TrackEditableFields>({
    title: track.title ?? '',
    artist: track.artist,
    album: track.album ?? '',
    genre: track.genre,
  });

  const libraryAPI = useLibraryAPI();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await libraryAPI.updateTrackMetadata(track._id, formData);
      navigate(-1);
    },
    [track, formData, navigate, libraryAPI],
  );

  const handleCancel = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      navigate(-1);
    },
    [navigate],
  );

  return (
    <div className={`${appStyles.view} ${styles.viewDetails}`}>
      <form className={styles.detailsForm} onSubmit={handleSubmit}>
        <h2>Edit &quot;{formData.title}&quot;</h2>
        <Setting.Section>
          <Setting.Label htmlFor="title">Title</Setting.Label>
          <Setting.Input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.currentTarget.value });
            }}
          />
          <Setting.Description>
            You can add multiple artists with commas
          </Setting.Description>
        </Setting.Section>
        <Setting.Section>
          <Setting.Label htmlFor="artist">Artist</Setting.Label>
          <Setting.Input
            id="artist"
            name="artist"
            type="text"
            value={formData.artist.join(DELIMITER)}
            onChange={(e) => {
              setFormData({
                ...formData,
                artist: e.currentTarget.value.split(DELIMITER),
              });
            }}
          />
        </Setting.Section>
        <Setting.Section>
          <Setting.Label htmlFor="album">Album</Setting.Label>
          <Setting.Input
            id="album"
            name="album"
            type="text"
            value={formData.album}
            onChange={(e) => {
              setFormData({ ...formData, album: e.currentTarget.value });
            }}
          />
        </Setting.Section>
        <Setting.Section>
          <Setting.Label htmlFor="genre">Genre</Setting.Label>
          <Setting.Input
            id="genre"
            name="genre"
            type="text"
            value={formData.genre.join(DELIMITER)}
            onChange={(e) => {
              setFormData({
                ...formData,
                genre: e.currentTarget.value.split(DELIMITER),
              });
            }}
          />
          <Setting.Description>
            You can add multiple genre with commas
          </Setting.Description>
        </Setting.Section>
        {/* <div className={styles.detailsCover}>
          {coverSrc === null && <img src={Placeholder} alt='Cover' width='150' height='150' />}
          {coverSrc !== null && <img src={coverSrc} alt='Cover' width='150' height='150' />}
        </div> */}
        <div className={styles.detailsActions}>
          <Button type="button" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
        <p>
          Clicking &quot;save&quot; will only update the library data, and will
          not save it to the original file.
        </p>
      </form>
    </div>
  );
}

export type DetailsLoaderData = LoaderData<typeof ViewTrackDetails.loader>;

ViewTrackDetails.loader = async ({ params }: LoaderFunctionArgs) => {
  const { trackID } = params;

  if (trackID == null) {
    throw new Error(`Track ID should not be null`);
  }

  const track = await window.MuseeksAPI.db.tracks.findOnlyByID(trackID);

  return { track };
};
