import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { Providers } from './app/Providers';
import { ErrorBoundary } from './components/ErrorBoundary';
import { runEmergencyExport } from './storage/emergencyExport';
import './design-system/tokens.css';
import './design-system/base.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary onExport={() => void runEmergencyExport()}>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </StrictMode>,
);
