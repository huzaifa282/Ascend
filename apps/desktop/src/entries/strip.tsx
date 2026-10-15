import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Strip } from '@ascendant/app/companion/Strip';
import '../styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Strip />
  </StrictMode>,
);
