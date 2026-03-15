import { Route, Routes } from 'react-router-dom';
import './App.css';
import { Accounts } from './Accounts';

export function App() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Accounts />} />
          <Route path="/accounts" element={<Accounts />} />
        </Routes>
      </main>
    </div>
  );
}
