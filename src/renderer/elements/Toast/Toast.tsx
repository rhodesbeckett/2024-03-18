import cx from 'classnames';

import styles from './Toast.module.css';

interface Props {
  type: 'danger' | 'info' | 'warning' | 'success';
  content: string;
}

/**
 * Toast single item
 */
function ToastItem(props: Props) {
  const { type, content } = props;

  const classes = cx(styles.toast, {
    [styles.toastSuccess]: type === 'success',
    [styles.toastWarning]: type === 'warning',
    [styles.toastDanger]: type === 'danger',
    [styles.toastInfo]: type === 'info',
  });

  return <div className={classes}>{content}</div>;
}

export default ToastItem;
