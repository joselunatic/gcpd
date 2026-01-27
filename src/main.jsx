import ReactDOM from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom';
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
      <App />
  </BrowserRouter>
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      window.__swRegistration = reg;
      if (reg.waiting) {
        window.dispatchEvent(new Event('sw-update-ready'));
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new Event('sw-update-ready'));
          }
        });
      });
      setInterval(() => {
        reg.update().catch(() => {});
      }, 60000);
    }).catch(() => {});

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
