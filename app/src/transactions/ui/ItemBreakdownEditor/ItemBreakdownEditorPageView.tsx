import type { ReactNode } from 'react';

export function ItemBreakdownEditorPageView(props: { title: string; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  return (
    <section className="gz-app-screen d-flex flex-column min-vh-100" aria-label={props.title}>
      <header className="d-flex align-items-center justify-content-between gap-3 py-3">
        <button type="button" className="gz-icon-button" aria-label="Close item editor" onClick={props.onClose}>
          <i className="bi bi-x-lg" aria-hidden />
        </button>
        <h2 className="h5 mb-0">{props.title}</h2>
        <span className="gz-icon-button" aria-hidden />
      </header>
      <div className="flex-grow-1 min-vh-0">{props.children}</div>
      {props.footer ? <footer className="sticky-bottom bg-body p-3">{props.footer}</footer> : null}
    </section>
  );
}
