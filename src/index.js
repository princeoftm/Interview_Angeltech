import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './frontend/components/App'; // Your main app component

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);