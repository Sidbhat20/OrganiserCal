import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ErrorBoundary } from './ErrorBoundary.jsx'

console.log('main.jsx loaded - Loading real App component');

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  console.log('React app rendered successfully');
} catch (error) {
  console.error('Error rendering React app:', error);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = '<div style="padding:20px; color:red; font-family:sans-serif;"><h1>Error</h1><p>' + error.message + '</p><pre>' + error.stack + '</pre></div>';
  }
}
