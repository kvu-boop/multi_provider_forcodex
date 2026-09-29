# OpenCode Go for Codex

Local MCP plugin for asking `deepseek-v4.1-flash` and `space-bunny-free` from Codex desktop.
It calls OpenCode Go as a tool; it does not change the model that powers Codex.

## Setup

1. Subscribe to OpenCode Go and get an API key from the [OpenCode console](https://opencode.ai/console).
2. Run `node opencode-go/server/setup.mjs` from this repository and paste the key into the terminal. The key is stored outside the repository at `~/.config/opencode-go-plugin/api-key` with owner-only permissions. Alternatively, set `OPENCODE_GO_API_KEY` in the Codex process environment.
3. Install the `opencode-go` local plugin in Codex. The MCP server needs Node.js 20 or newer and uses no npm packages.
4. Ask Codex to use the `ask_opencode_go` tool with one of the two models.

For follow-up requests, reuse the returned `session_id` and provide relevant prior messages in `history`. Text passed to the tool is sent to OpenCode Go.

The upstream endpoint and model IDs follow the [OpenCode Go documentation](https://opencode.ai/docs/go/). A live API call requires a valid key and subscription.
