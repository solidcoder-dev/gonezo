import { NavLink, Route, Routes } from 'react-router-dom';
import './App.css';
import { Dashboard } from './Dashboard';
import { Budget } from './Budget';
import { BudgetPeriod } from './budget/BudgetPeriod';
import { Accounts } from './Accounts';
import { Debug } from './Debug';

type TabIconProps = {
  name: 'home' | 'budget' | 'accounts';
};

function TabIcon({ name }: TabIconProps) {
  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3L3 10v11h6v-7h6v7h6V10z" />
      </svg>
    );
  }
  if (name === 'budget') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18v12H3zM6 9h12v2H6zm0 4h8v2H6z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0 0-10a5 5 0 0 0 0 10zM3 21a9 9 0 0 1 18 0z" />
    </svg>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">gonezo</div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/budget/period/:periodId" element={<BudgetPeriod />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/debug" element={<Debug />} />
        </Routes>
      </main>

      <nav className="tabbar" aria-label="Primary">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          <span className="tab-icon">
            <TabIcon name="home" />
          </span>
          <span className="tab-label">Home</span>
        </NavLink>
        <NavLink to="/budget" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          <span className="tab-icon">
            <TabIcon name="budget" />
          </span>
          <span className="tab-label">Budget</span>
        </NavLink>
        <NavLink to="/accounts" className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          <span className="tab-icon">
            <TabIcon name="accounts" />
          </span>
          <span className="tab-label">Accounts</span>
        </NavLink>
      </nav>
    </div>
  );
}
