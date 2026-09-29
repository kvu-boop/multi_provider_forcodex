import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const MODELS = ['deepseek-v4.1-flash', 'space-bunny-free'];
const ENDPOINT = 'https://opencode.ai/zen/go/v1/chat/completions';

export async function getApiKey() {
  if (process.env.OPENCODE_GO_API_KEY?.trim()) return process.env.OPENCODE_GO_API_KEY.trim();
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  try {
    return (await readFile(join(configHome, 'opencode-go-plugin', 'api-key'), 'utf8')).trim();
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('OpenCode Go API key is missing. Run: node opencode-go/server/setup.mjs');
    throw error;
  }
}

export async function askGo(input, options = {}) {
  const { fetchImpl = fetch, apiKey = await getApiKey() } = options;
  const { prompt, model, session_id, history = [] } = input;
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 100_000) {
    throw new Error('prompt must be nonempty and at most 100,000 characters');
  }
  if (!MODELS.includes(model)) throw new Error(`Unsupported model: ${String(model)}`);
  if (!Array.isArray(history) || history.length > 20 || history.some(
    item => !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 100_000
  )) throw new Error('history must contain at most 20 user/assistant text messages');
  const sessionId = session_id || randomUUID();
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(sessionId)) {
    throw new Error('session_id must contain 8–128 letters, numbers, underscores, or hyphens');
  }
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'user-agent': 'codex-opencode-go-plugin/0.1.0',
      'x-opencode-session': sessionId,
    },
    body: JSON.stringify({ model, messages: [...history, { role: 'user', content: prompt }], stream: false }),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || response.statusText || 'Unknown upstream error';
    throw new Error(`OpenCode Go HTTP ${response.status}: ${String(message).slice(0, 500)}`);
  }
  const answer = payload?.choices?.[0]?.message?.content;
  if (typeof answer !== 'string') throw new Error('OpenCode Go returned no text response');
  return { model, session_id: sessionId, answer, usage: payload.usage || null };
}
