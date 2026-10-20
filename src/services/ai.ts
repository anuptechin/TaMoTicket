/**
 * Optional live AI. Every call has a scripted fallback that is used when there is
 * no server, no key, no network, or the call takes longer than 6 seconds.
 */
let health: Promise<boolean> | null = null;

export function aiAvailable(): Promise<boolean> {
  if (!health) {
    health = (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 1500);
        const r = await fetch('/api/health', { signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) return false;
        const j = (await r.json()) as { ai?: boolean };
        return !!j.ai;
      } catch {
        return false;
      }
    })();
  }
  return health;
}

export interface AiResult {
  text: string;
  live: boolean;
}

export async function aiComplete(prompt: string, fallback: string, system?: string): Promise<AiResult> {
  if (!(await aiAvailable())) return { text: fallback, live: false };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return { text: fallback, live: false };
    const j = (await r.json()) as { text?: string };
    const text = j.text?.trim();
    return text ? { text, live: true } : { text: fallback, live: false };
  } catch {
    return { text: fallback, live: false };
  }
}

/** Realistic latency for the mock service layer. */
export const latency = (min = 150, max = 600) => new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)));
