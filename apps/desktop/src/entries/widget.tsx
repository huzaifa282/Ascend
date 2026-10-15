import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Widget } from '@ascendant/app/companion/Widget';
import '../styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Widget />
  </StrictMode>,
);
