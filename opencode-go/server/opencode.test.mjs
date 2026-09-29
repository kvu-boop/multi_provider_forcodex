import test from 'node:test';
import assert from 'node:assert/strict';
import { askGo } from './opencode.mjs';

test('sends selected model and stable session header', async () => {
  let request;
  const result = await askGo({
    prompt: 'Review this function', model: 'deepseek-v4.1-flash', session_id: 'session_123',
    history: [{ role: 'user', content: 'Here is the code' }],
  }, {
    apiKey: 'test-key',
    fetchImpl: async (url, init) => {
      request = { url, init };
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Looks good' } }] }) };
    },
  });
  assert.equal(request.url, 'https://opencode.ai/zen/go/v1/chat/completions');
  assert.equal(request.init.headers['x-opencode-session'], 'session_123');
  assert.equal(request.init.headers.authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(request.init.body).messages, [
    { role: 'user', content: 'Here is the code' }, { role: 'user', content: 'Review this function' },
  ]);
  assert.equal(result.answer, 'Looks good');
  assert.equal(result.session_id, 'session_123');
});

test('rejects unsupported model before network call', async () => {
  await assert.rejects(askGo({ prompt: 'Hi', model: 'unknown' }, {
    apiKey: 'test-key', fetchImpl: () => { throw new Error('called network'); },
  }), /Unsupported model/);
});

test('returns upstream error without leaking the API key', async () => {
  await assert.rejects(askGo({ prompt: 'Hi', model: 'space-bunny-free' }, {
    apiKey: 'test-key', fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'Unauthorized' } }) }),
  }), /OpenCode Go HTTP 401: Unauthorized/);
});
