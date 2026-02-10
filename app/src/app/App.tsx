import { Link, Route, Routes } from 'react-router-dom';
import './App.css';
import { Home } from './Home';
import { Debug } from './Debug';

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">gonezo multiplatform</div>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/debug">Debug</Link>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/debug" element={<Debug />} />
        </Routes>
      </main>
    </div>
  );
}
