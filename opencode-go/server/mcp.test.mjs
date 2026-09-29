import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

test('MCP initializes and discovers the model tool', async () => {
  const server = spawn(process.execPath, [new URL('./index.mjs', import.meta.url).pathname], { stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = createInterface({ input: server.stdout });
  const messages = [];
  lines.on('line', line => messages.push(JSON.parse(line)));
  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })}\n`);
  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`);
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('MCP response timeout')), 2000);
    const timer = setInterval(() => {
      if (messages.length >= 2) { clearTimeout(deadline); clearInterval(timer); resolve(); }
    }, 5);
  });
  assert.equal(messages[0].result.serverInfo.name, 'opencode-go');
  assert.equal(messages[1].result.tools[0].name, 'ask_opencode_go');
  assert.deepEqual(messages[1].result.tools[0].inputSchema.properties.model.enum, ['deepseek-v4.1-flash', 'space-bunny-free']);
  server.stdin.end();
  server.kill();
});
