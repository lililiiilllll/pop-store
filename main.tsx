import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // './app'이 아니라 반드시 './App' (대소문자)
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
