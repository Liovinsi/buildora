import { useEffect, useRef } from 'react';

// Calls `callback` every `delay` ms while the tab is visible. Pass null to pause.
export function useInterval(callback, delay) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') saved.current();
    }, delay);
    return () => clearInterval(id);
  }, [delay]);
}
