import styles from './DropzoneImport.module.css';

type Props = {
  title: string;
  subtitle: string;
  shown: boolean;
};

export default function DropzoneImport(props: Props) {
  return (
    <div className={`${styles.dropzone} ${props.shown && styles.shown}`}>
      <div className={styles.dropzone__title}>{props.title}</div>
      <div className={styles.dropzone__subtitle}>{props.subtitle}</div>
    </div>
  );
}
