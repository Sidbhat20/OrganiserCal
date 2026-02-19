import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('main.jsx loaded');
console.log('root element:', document.getElementById('root'));

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('React app rendered successfully');
} catch (error) {
  console.error('Error rendering React app:', error);
  document.getElementById('root').innerHTML = '<h1>Error: ' + error.message + '</h1>';
}
