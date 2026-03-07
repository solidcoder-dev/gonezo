import { Route, Routes } from 'react-router-dom';
import './App.css';
import { Budget } from './Budget';
import { BudgetPeriod } from './budget/BudgetPeriod';
import { Accounts } from './Accounts';
import { Debug } from './Debug';

export function App() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Accounts />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/budget/period/:periodId" element={<BudgetPeriod />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/debug" element={<Debug />} />
        </Routes>
      </main>
    </div>
  );
}
