import styles from "./landing.module.css";

/**
 * The spinning blue, purple and green border with a soft glow, first used on
 * The SEFGH Insider card. The child supplies its own solid background, which
 * covers the inside so only a 1.5px ring shows.
 */
export default function SpinBorder({ radius = 12, className = "", children }) {
  return (
    <div className={`${styles.spin} ${className}`} style={{ "--spin-radius": `${radius}px` }}>
      <div className={styles.spinRing} aria-hidden="true" />
      <div className={styles.spinGlow} aria-hidden="true" />
      {children}
    </div>
  );
}
