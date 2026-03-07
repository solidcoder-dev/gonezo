import { Link } from 'react-router-dom';

export function Budget() {
  return (
    <section className="card">
      <h1>Budget</h1>
      <p>Current period overview and budget actions.</p>
      <div className="stack">
        <Link className="action-link" to="/budget/period/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb">
          Open current period
        </Link>
      </div>
    </section>
  );
}
