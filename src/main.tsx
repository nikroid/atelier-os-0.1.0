import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { seedDemoData } from './utils/backup';
import { cleanupBuiltinTemplatesFromDb } from './utils/defaultTemplates';
import { db } from './db/database';
import { ensureDefaultSettings } from './hooks/useSettings';
import { APP_BUILD_TIME, APP_VERSION, getVersionFull, getVersionLabel } from './version';
import './index.css';

document.documentElement.dataset.atelierVersion = APP_VERSION;
document.documentElement.dataset.atelierBuiltAt = APP_BUILD_TIME;

Object.assign(window, {
  __ATELIER_OS__: {
    version: APP_VERSION,
    builtAt: APP_BUILD_TIME,
    label: getVersionLabel(),
  },
});

console.info(
  `%cAtelier OS%c ${getVersionFull()}`,
  'font-weight:bold;color:#c45d3a',
  'color:inherit',
);
console.info('Vérifier : document.documentElement.dataset ou window.__ATELIER_OS__');

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Le SW casse le hot-reload Vite (WebSocket) en local
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => void reg.unregister());
    });
  } else {
    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker.register(swUrl).catch(() => {});
    });
  }
}

seedDemoData()
  .then(() => ensureDefaultSettings())
  .then(() =>
    cleanupBuiltinTemplatesFromDb(
      () => db.templates.toArray(),
      (id) => db.templates.delete(id),
    ),
  )
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
