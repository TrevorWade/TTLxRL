import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * OverlayContext
 * Simple UI state holder for the stream overlay visibility.
 * - isOverlayOpen: whether the overlay should be shown
 * - toggleOverlay: flips visibility state
 *
 * We keep this small and generic so any component can toggle the overlay
 * without prop-drilling (e.g., toolbar button and the overlay itself).
 */
const OverlayContext = createContext({
  isOverlayOpen: false,
  toggleOverlay: () => {},
});

export function OverlayProvider({ children }) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const toggleOverlay = useCallback(() => {
    setIsOverlayOpen((v) => !v);
  }, []);

  const value = useMemo(() => ({ isOverlayOpen, toggleOverlay }), [isOverlayOpen, toggleOverlay]);

  return (
    <OverlayContext.Provider value={value}>
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  return useContext(OverlayContext);
}


