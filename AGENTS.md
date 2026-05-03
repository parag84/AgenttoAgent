# AgentFlow

CLI tool for running Cursor SDK agents programmatically. Single-package TypeScript project using npm.

## Cursor Cloud specific instructions

### Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` |
| Dev mode | `npm run dev -- <args>` |
| Built mode | `npm start -- <args>` |

### Notes

- **No test suite exists.** There are no automated tests or test frameworks configured. Validation is done by running the CLI commands directly.
- **No linter is configured.** Typechecking (`npm run typecheck`) is the only static analysis available.
- The project requires **Node.js >= 20**. The Cloud VM does not ship Node.js by default; it is installed via the update script from the NodeSource repository.
- All agent operations require a valid `CURSOR_API_KEY`. Set it in the environment or pass `--api-key <key>`. The CLI also reads from a `.env` file in the current directory.
- The actual application code lives on the `cursor/agentflow-cursor-sdk-5f5b` branch. The `main` branch contains only the initial README.
- Dev mode uses `tsx` for direct TypeScript execution without a build step: `npm run dev -- run "prompt"`.
- Built mode compiles to `dist/` first via `npm run build`, then runs with `npm start -- run "prompt"`.
- The streaming output in the terminal interleaves streamed text tokens with `[tool ...]` and `[status]` lines. This is expected behavior, not an error.
- To verify the full CLI works end-to-end, run: `npm run dev -- models` (lists models) and `npm run dev -- run "List files"` (runs a local agent).
