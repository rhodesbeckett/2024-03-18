import InlineSVG from 'svg-inline-react';
import cx from 'classnames';

import icons from '../../lib/icons';
import usePlayerStore, { usePlayerAPI } from '../../stores/usePlayerStore';

import styles from './common.module.css';

export default function ButtonShuffle() {
  const shuffle = usePlayerStore((state) => state.shuffle);
  const playerAPI = usePlayerAPI();

  const buttonClasses = cx(styles.button, {
    [styles.active]: shuffle,
  });

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={() => {
        playerAPI.toggleShuffle();
      }}
    >
      <InlineSVG src={icons.SHUFFLE} className={styles.icon} />
    </button>
  );
}
