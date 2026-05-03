# AgentFlow

Small CLI for running **programmatic Cursor agents** via the official [`@cursor/sdk`](https://cursor.com/docs/sdk/typescript) (TypeScript). It streams assistant text, tool use, and status events to your terminal.

## Why Cursor SDK (not Claude Agent SDK here)

| | **Cursor `@cursor/sdk`** | **Claude Agent SDK** (`claude-agent-sdk`) |
|---|---------------------------|-------------------------------------------|
| Runtime | Same harness as Cursor IDE / cloud agents | Claude Code–style tools + bundled CLI |
| Auth | `CURSOR_API_KEY` | Anthropic / Claude Code auth |
| Languages | TypeScript (first-class) | Python and TypeScript |

This repo uses the **Cursor SDK** so the app matches Cursor’s agent runtime and billing, and stays in one Node toolchain. The Claude SDK is excellent when you want the Claude Code tool loop in Python; see [Anthropic’s docs](https://docs.anthropic.com/en/docs/agent-sdk/python) if you prefer that path.

## Prerequisites

- **Node.js 20+**
- A **Cursor API key** with agent access ([Cursor Dashboard → Integrations](https://cursor.com/dashboard))

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and set CURSOR_API_KEY=...
npm run build
```

## Usage

**Local agent** (uses `--cwd` as the repo root; defaults to the current directory):

```bash
npm run dev -- run "Give a one-paragraph summary of this repository"
# or after build:
npm start -- run "List top-level files"
```

**List models** your key can use:

```bash
npm run dev -- models
```

**Cloud agent** (requires at least one GitHub repo URL your Cursor account can access):

```bash
npm run dev -- run --cloud --repo https://github.com/org/repo --ref main \
  "Open a PR that fixes the typo in README"
```

Flags: `--model <id>`, `--json` (raw SDK messages), `--auto-pr` (with `--cloud`), `--api-key` (instead of env).

Global install (optional): `npm link` then run `agentflow`.

## Create the GitHub repo `AgentFlow`

Automated `gh repo create` may fail if the token lacks the **create repository** scope. In that case:

1. On GitHub: **New repository** → name `AgentFlow` → create (no README if you will push this tree).
2. Point this project at the new remote and push:

```bash
git remote remove origin   # only if you still point at another repo
git remote add origin https://github.com/<you>/AgentFlow.git
git push -u origin cursor/agentflow-cursor-sdk-5f5b
```

Then open a PR from that branch to `main` on `AgentFlow`, or merge as you prefer.

## License

MIT
