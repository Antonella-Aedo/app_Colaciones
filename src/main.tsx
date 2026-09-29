import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './App';
// Tipografía self-hosted: mantiene intacto el CSP `font-src 'self'`.
import '@fontsource-variable/plus-jakarta-sans';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
