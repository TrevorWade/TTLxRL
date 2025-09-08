import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import StreamOverlay from './components/StreamOverlay.jsx';
import { OverlayProvider } from './context/OverlayContext.jsx';
import './index.css';

const root = createRoot(document.getElementById('root'));
const isOverlayRoute = typeof window !== 'undefined' && window.location.hash === '#overlay';

root.render(
  <OverlayProvider>
    {isOverlayRoute ? (
      <StreamOverlay mapping={{}} likeTriggers={[]} onCloseOverride={() => { window.close?.(); }} transparentBackground={true} />
    ) : (
      <App />
    )}
  </OverlayProvider>
);


