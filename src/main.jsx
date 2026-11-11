import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initSupabase } from './lib/supabase.js';
import './styles.css';

const root = createRoot(document.getElementById('root'));
const start = () => root.render(<React.StrictMode><ErrorBoundary><BrowserRouter><App /></BrowserRouter></ErrorBoundary></React.StrictMode>);
// Ne bloque jamais le démarrage : si Supabase est désactivé ou en erreur, le site se lance sans lui.
initSupabase().then(start, start);
