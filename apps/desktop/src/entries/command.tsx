import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Command } from '@ascendant/app/companion/Command';
import '../styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Command />
  </StrictMode>,
);
