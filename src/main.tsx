import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Interceptor global para inyectar el usuario simulado en todas las llamadas
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  config = config || {};
  config.headers = {
    ...config.headers,
    'x-user-id': localStorage.getItem('atenea_user_id') || '1'
  };
  return originalFetch(resource, config);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
