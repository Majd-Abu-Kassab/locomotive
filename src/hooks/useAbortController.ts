import { useRef, useCallback, useEffect } from 'react';

export function useAbortController() {
  const ref = useRef<AbortController | null>(null);

  const getSignal = useCallback(() => {
    ref.current?.abort('AbortError');
    ref.current = new AbortController();
    return ref.current.signal;
  }, []);

  useEffect(() => {
    return () => {
      ref.current?.abort('AbortError');
    };
  }, []);

  return { getSignal };
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error === 'AbortError') return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && (error.name === 'AbortError' || error.message === 'AbortError' || error.message.includes('aborted'))) return true;
  if (typeof error === 'object' && error !== null) {
      const e = error as any;
      if (e.name === 'AbortError') return true;
      if (typeof e.message === 'string' && (e.message.includes('AbortError') || e.message.includes('aborted'))) return true;
  }
  return false;
}
