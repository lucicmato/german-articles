import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { StyledEngineProvider } from '@mui/material/styles';
import { App } from './App';

import './index.css';

// `injectFirst` puts MUI's styles before ours, so SCSS module classes win without `!important`.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StyledEngineProvider injectFirst>
      <App />
    </StyledEngineProvider>
  </StrictMode>,
);
