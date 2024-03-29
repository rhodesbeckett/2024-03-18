import React, { useMemo } from 'react';

import QueueEmpty from '../QueueEmpty/QueueEmpty';
import QueueList from '../QueueList/QueueList';
import { TrackModel } from '../../../shared/types/museeks';

import styles from './Queue.module.css';

type Props = {
  queue: TrackModel[];
  queueCursor: number | null;
};

export default function Queue(props: Props) {
  const { queue, queueCursor } = props;
  let content: React.ReactNode;

  const isQueueEmpty = useMemo(() => {
    if (queueCursor == null) {
      return null;
    }

    return queue.slice(queueCursor + 1).length === 0;
  }, [queue, queueCursor]);

  if (isQueueEmpty || queueCursor == null) {
    content = <QueueEmpty />;
  } else {
    content = <QueueList queue={queue} queueCursor={queueCursor} />;
  }

  return <div className={`${styles.queue} text-left`}>{content}</div>;
}
