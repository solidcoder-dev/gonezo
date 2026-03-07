import { Link } from 'react-router-dom';

export function Dashboard() {
  return (
    <section className="card">
      <h1>Home</h1>
      <p>Start from accounts to add expenses and track the latest activity.</p>
      <div className="stack">
        <Link className="action-link" to="/accounts">
          Open accounts summary
        </Link>
        <Link className="action-link" to="/budget">
          Open budget summary
        </Link>
        <Link className="action-link" to="/debug">
          Developer debug tools
        </Link>
      </div>
    </section>
  );
}
