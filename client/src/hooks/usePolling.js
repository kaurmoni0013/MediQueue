import { useEffect, useRef } from 'react';

/** Client-side polling helper used for live queue/status updates. */
export function usePolling(callback, intervalMs = 12000, enabled = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;
    cbRef.current();
    const timer = setInterval(() => cbRef.current(), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
}