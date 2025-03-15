
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import './index.css'

// Polyfill Buffer for browser compatibility
// This is a minimal polyfill that won't fully work but will prevent the app from crashing
if (typeof window !== 'undefined' && typeof Buffer === 'undefined') {
  console.warn('Buffer is not defined in this environment. Using minimal polyfill.');
  // @ts-ignore - Simple Buffer stub to prevent crashes
  window.Buffer = {
    from: (data: any) => ({ data }),
    isBuffer: () => false,
  };
}

// Catch unhandled errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
