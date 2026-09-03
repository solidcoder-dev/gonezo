import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import './styles/bootstrap.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';
import './shared/ui/primitives.css';
import { App } from './App';
import { BackNavigationBridge } from './workspace/application/BackNavigationBridge';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <BackNavigationBridge>
        <App />
      </BackNavigationBridge>
    </HashRouter>
  </React.StrictMode>
);
