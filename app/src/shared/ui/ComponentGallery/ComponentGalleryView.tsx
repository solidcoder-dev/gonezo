import styles from './ComponentGalleryView.module.css';

export function ComponentGalleryView() {
  return (
    <main className={`${styles.page} gz-app-screen`}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Gonezo UI</p>
        <h1>Component gallery</h1>
        <p>Development-only reference for semantic tokens, states and responsive contracts.</p>
      </header>
      <section className={styles.section} aria-labelledby="palette-title">
        <h2 id="palette-title">Semantic palette</h2>
        <div className={styles.swatches}>
          {['brand', 'income', 'expense', 'transfer', 'warning', 'error', 'surface', 'surface-elevated'].map((tone) => (
            <div key={tone} className={`${styles.swatch} ${styles[`swatch-${tone}`]}`}><span>{tone}</span></div>
          ))}
        </div>
      </section>
      <section className={styles.section} aria-labelledby="states-title">
        <h2 id="states-title">Interactive states</h2>
        <div className={styles.actions}>
          <button className="btn btn-primary" type="button">Primary action</button>
          <button className="gz-text-button" type="button">Text button</button>
          <button className="gz-icon-button" type="button" aria-label="Settings"><i className="bi bi-gear" /></button>
          <button className="btn btn-primary" type="button" disabled>Disabled</button>
        </div>
        <span className="gz-chip selected">Selected badge</span>
      </section>
      <section className={styles.section} aria-labelledby="content-title">
        <h2 id="content-title">Long content and surfaces</h2>
        <article className={styles.surface}>
          <h3>Surface with a translated or very long title</h3>
          <p>€1,234,567,890.12 · USD 999,999,999.99 · Texto secundario que debe envolver sin romper el layout.</p>
        </article>
      </section>
    </main>
  );
}
