import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { bootstrapSession } from './lib/api';
import { preloadRoute } from './lib/routes';
import './styles.css';
import './workspace.css';
// Start independent session and route-code loads before the first React effect.
void bootstrapSession();
preloadRoute(window.location.pathname);
createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>);
