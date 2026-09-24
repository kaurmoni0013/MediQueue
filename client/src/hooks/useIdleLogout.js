import { useEffect, useRef } from 'react';

/**
 * Signs the user out after a period of inactivity.
 * Listens for a whitelist of user events and resets a timer; when the
 * timer elapses, the session is revoked server-side and the user returns
 * to the login page — preventing abandoned terminals from staying open.
 */
export function useIdleLogout({ onIdle, timeoutMs = 10 * 60 * 1000 }) {
  const timer = useRef(null);
  const cb = useRef(onIdle);
  cb.current = onIdle;

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => cb.current(), timeoutMs);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs]);
}