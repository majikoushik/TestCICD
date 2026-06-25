import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AppProviders } from './contexts';
import ReduxProvider from './redux/provider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ReduxProvider>
        <AppProviders>
          <App />
        </AppProviders>
      </ReduxProvider>
    </BrowserRouter>
  </React.StrictMode>
);
