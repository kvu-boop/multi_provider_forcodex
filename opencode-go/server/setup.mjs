import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

if (!process.stdin.isTTY) throw new Error('Run setup in an interactive terminal');
process.stdout.write('Paste your OpenCode Go API key (input hidden): ');
process.stdin.setRawMode(true);
process.stdin.resume();
let key = '';
let done = false;
for await (const chunk of process.stdin) {
  for (const input of chunk.toString('utf8')) {
    if (input === '\r' || input === '\n') { done = true; break; }
    if (input === '\u0003') { process.stdin.setRawMode(false); process.stdout.write('\n'); process.exit(130); }
    if (input === '\u007f') { key = key.slice(0, -1); continue; }
    key += input;
  }
  if (done) break;
}
process.stdin.setRawMode(false);
process.stdin.pause();
process.stdout.write('\n');
key = key.trim();
if (!key) throw new Error('No API key entered');
const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
const directory = join(configHome, 'opencode-go-plugin');
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const path = join(directory, 'api-key');
await writeFile(path, `${key}\n`, { mode: 0o600 });
await chmod(path, 0o600);
process.stdout.write(`API key saved to ${path}\n`);
