import { useEffect } from 'react';
import { create } from 'zustand';

/** One shared 1 s ticker for every live timer on screen. */
export const useClock = create<{ now: number }>(() => ({ now: Date.now() }));

let started = false;
export function startClock() {
  if (started) return;
  started = true;
  setInterval(() => useClock.setState({ now: Date.now() }), 1000);
}

export const useNow = () => useClock((s) => s.now);

export function useInterval(fn: () => void, ms: number | null) {
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  }, [fn, ms]);
}
