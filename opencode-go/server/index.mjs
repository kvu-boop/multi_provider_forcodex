import readline from 'node:readline';
import { askGo, MODELS } from './opencode.mjs';

const TOOL = {
  name: 'ask_opencode_go',
  description: 'Send a coding question to an OpenCode Go model. Content in prompt and history is sent to OpenCode Go. Reuse the returned session_id and include relevant history for follow-up calls.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Question or coding task to send.' },
      model: { type: 'string', enum: MODELS, description: 'OpenCode Go model.' },
      session_id: { type: 'string', description: 'Reuse the session_id from a prior call in the same conversation.' },
      history: { type: 'array', description: 'Relevant prior user and assistant messages, if needed.', items: {
        type: 'object', properties: { role: { type: 'string', enum: ['user', 'assistant'] }, content: { type: 'string' } }, required: ['role', 'content'], additionalProperties: false,
      } },
    },
    required: ['prompt', 'model'],
    additionalProperties: false,
  },
};

function send(message) { process.stdout.write(`${JSON.stringify(message)}\n`); }
async function handle(request) {
  if (!request || request.jsonrpc !== '2.0' || typeof request.method !== 'string') return;
  if (request.id === undefined) return;
  const base = { jsonrpc: '2.0', id: request.id };
  try {
    switch (request.method) {
      case 'initialize':
        send({ ...base, result: {
          protocolVersion: request.params?.protocolVersion || '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'opencode-go', version: '0.1.0' },
        } });
        break;
      case 'ping': send({ ...base, result: {} }); break;
      case 'tools/list': send({ ...base, result: { tools: [TOOL] } }); break;
      case 'tools/call':
        if (request.params?.name !== TOOL.name) {
          send({ ...base, error: { code: -32602, message: 'Unknown tool' } });
          break;
        }
        try {
          const result = await askGo(request.params.arguments || {});
          send({ ...base, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } });
        } catch (error) {
          send({ ...base, result: { isError: true, content: [{ type: 'text', text: error.message }] } });
        }
        break;
      default: send({ ...base, error: { code: -32601, message: 'Method not found' } });
    }
  } catch (error) {
    send({ ...base, error: { code: -32603, message: error.message } });
  }
}

readline.createInterface({ input: process.stdin, crlfDelay: Infinity }).on('line', line => {
  try { void handle(JSON.parse(line)); }
  catch { process.stderr.write('Invalid MCP JSON received\n'); }
});
