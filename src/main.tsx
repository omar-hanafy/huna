import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { runEmergencyExport } from './storage/emergencyExport';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary onExport={runEmergencyExport}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
