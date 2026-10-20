import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Optional live AI for the demo. The web app never depends on this server:
 * every AI feature falls back to a scripted answer if this is down, has no key,
 * or takes longer than 6 seconds.
 */
const PORT = Number(process.env.AI_PORT || 8787);
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const hasKey = !!process.env.ANTHROPIC_API_KEY;

const client = hasKey ? new Anthropic({ timeout: 6000, maxRetries: 0 }) : null;

const app = express();
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ai: hasKey, model: hasKey ? MODEL : null });
});

app.post('/api/ai', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'AI disabled: set ANTHROPIC_API_KEY' });
  const { prompt, system } = (req.body ?? {}) as { prompt?: string; system?: string };
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt is required' });

  try {
    // Server-side refusal fallback is enabled so a declined request is retried on a fallback model in the same call.
    const params = {
      model: MODEL,
      max_tokens: 1024,
      system: system || 'You are a concise assistant inside a customer support application.',
      messages: [{ role: 'user' as const, content: prompt.slice(0, 8000) }],
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    };
    const msg = await client.beta.messages.create(params as unknown as Parameters<typeof client.beta.messages.create>[0]);
    const message = msg as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
    if (message.stop_reason === 'refusal') return res.status(422).json({ error: 'refused' });
    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();
    res.json({ text });
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) return res.status(504).json({ error: 'timeout' });
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'rate limited' });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: err.message });
    res.status(500).json({ error: 'unexpected error' });
  }
});

app.listen(PORT, () => {
  console.log(`[ai] listening on http://localhost:${PORT} · ${hasKey ? `live AI with ${MODEL}` : 'no ANTHROPIC_API_KEY: scripted fallbacks only'}`);
});
