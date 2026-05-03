#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Agent, Cursor } from "@cursor/sdk";
import type { SDKMessage } from "@cursor/sdk";

function loadDotEnv(cwd: string): void {
  const p = resolve(cwd, ".env");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function printHelp(): void {
  console.log(`AgentFlow — run a Cursor SDK agent from the terminal

Usage:
  agentflow run [options] <prompt>
  agentflow models

Environment:
  CURSOR_API_KEY   Required (or pass --api-key). Optional .env in cwd.

Options (run):
  --cwd <path>           Working directory for a local agent (default: cwd)
  --model <id>           Model id, e.g. composer-2 (default: composer-2)
  --cloud                Use cloud runtime instead of local
  --repo <url>           With --cloud: GitHub repo URL (can repeat)
  --ref <branch>         With first --repo: starting git ref (default: main)
  --auto-pr              With --cloud: pass autoCreatePR to the SDK
  --api-key <key>        Override CURSOR_API_KEY
  --json                 Print raw SDK messages as JSON lines

Examples:
  agentflow run "Summarize the README in one paragraph"
  agentflow run --cloud --repo https://github.com/org/repo --ref main "Fix typo in README"
`);
}

function formatMessage(msg: SDKMessage): string {
  switch (msg.type) {
    case "assistant": {
      const parts = msg.message.content
        .map((b) => (b.type === "text" ? b.text : `[tool_use: ${b.name}]`))
        .join("");
      return parts;
    }
    case "tool_call":
      return `[tool ${msg.name}] ${msg.status}${msg.result != null ? ` → ${truncate(String(msg.result), 200)}` : ""}`;
    case "thinking":
      return `[thinking] ${truncate(msg.text, 500)}`;
    case "status":
      return `[status] ${msg.status}${msg.message ? `: ${msg.message}` : ""}`;
    case "system":
      return `[system] ${msg.subtype ?? "init"} model=${msg.model?.id ?? "?"}`;
    case "user":
      return `[user] ${msg.message.content.map((c) => c.text).join("")}`;
    case "request":
      return `[request] ${msg.request_id}`;
    case "task":
      return `[task] ${msg.status ?? ""} ${msg.text ?? ""}`.trim();
    default: {
      const _exhaustive: never = msg;
      return JSON.stringify(_exhaustive);
    }
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function parseArgs(argv: string[]): {
  command: "run" | "models" | "help";
  flags: {
    cwd: string;
    model: string;
    cloud: boolean;
    repos: Array<{ url: string; startingRef?: string }>;
    autoPr: boolean;
    apiKey?: string;
    json: boolean;
  };
  prompt: string;
} {
  const rest = argv.slice(2);
  if (rest.length === 0 || rest[0] === "-h" || rest[0] === "--help") {
    return {
      command: "help",
      flags: {
        cwd: process.cwd(),
        model: "composer-2",
        cloud: false,
        repos: [],
        autoPr: false,
        json: false,
      },
      prompt: "",
    };
  }

  const cmd = rest[0];
  if (cmd === "help" || cmd === "-h" || cmd === "--help") {
    return {
      command: "help",
      flags: {
        cwd: process.cwd(),
        model: "composer-2",
        cloud: false,
        repos: [],
        autoPr: false,
        json: false,
      },
      prompt: "",
    };
  }

  if (cmd === "models") {
    return {
      command: "models",
      flags: {
        cwd: process.cwd(),
        model: "composer-2",
        cloud: false,
        repos: [],
        autoPr: false,
        json: false,
      },
      prompt: "",
    };
  }

  if (cmd !== "run") {
    return {
      command: "help",
      flags: {
        cwd: process.cwd(),
        model: "composer-2",
        cloud: false,
        repos: [],
        autoPr: false,
        json: false,
      },
      prompt: "",
    };
  }

  const flags = {
    cwd: process.cwd(),
    model: "composer-2",
    cloud: false,
    repos: [] as Array<{ url: string; startingRef?: string }>,
    autoPr: false,
    apiKey: undefined as string | undefined,
    json: false,
  };

  let i = 1;
  while (i < rest.length) {
    const a = rest[i];
    if (a === "--cwd" && rest[i + 1]) {
      flags.cwd = resolve(rest[++i]);
    } else if (a === "--model" && rest[i + 1]) {
      flags.model = rest[++i];
    } else if (a === "--cloud") {
      flags.cloud = true;
    } else if (a === "--repo" && rest[i + 1]) {
      flags.repos.push({ url: rest[++i] });
    } else if (a === "--ref" && rest[i + 1]) {
      const ref = rest[++i];
      const last = flags.repos[flags.repos.length - 1];
      if (last) last.startingRef = ref;
    } else if (a === "--auto-pr") {
      flags.autoPr = true;
    } else if (a === "--api-key" && rest[i + 1]) {
      flags.apiKey = rest[++i];
    } else if (a === "--json") {
      flags.json = true;
    } else if (!a.startsWith("-")) {
      break;
    } else {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    }
    i++;
  }

  const prompt = rest.slice(i).join(" ").trim();
  return { command: "run", flags, prompt };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (parsed.command === "help" || (parsed.command === "run" && !parsed.prompt)) {
    printHelp();
    process.exit(parsed.command === "run" ? 1 : 0);
  }

  loadDotEnv(process.cwd());

  const apiKey = parsed.flags.apiKey ?? process.env.CURSOR_API_KEY;
  if (parsed.command === "models") {
    if (!apiKey) {
      console.error("Missing CURSOR_API_KEY (or --api-key).");
      process.exit(1);
    }
    const models = await Cursor.models.list({ apiKey });
    for (const m of models) {
      console.log(`${m.id}\t${m.displayName ?? ""}`);
    }
    return;
  }

  if (!apiKey) {
    console.error("Missing CURSOR_API_KEY (or --api-key). Copy .env.example to .env.");
    process.exit(1);
  }

  if (parsed.command !== "run") return;

  const { cwd, model, cloud, repos, autoPr, json } = parsed.flags;

  if (cloud && repos.length === 0) {
    console.error("Cloud mode requires at least one --repo <https://github.com/org/repo>.");
    process.exit(1);
  }

  const agent = await Agent.create({
    apiKey,
    model: { id: model },
    ...(cloud
      ? {
          cloud: {
            repos: repos.map((r) => ({
              url: r.url,
              startingRef: r.startingRef ?? "main",
            })),
            autoCreatePR: autoPr,
          },
        }
      : { local: { cwd } }),
  });

  try {
    const run = await agent.send(parsed.prompt);
    if (!run.supports("stream")) {
      console.error(
        `This run does not support streaming: ${run.unsupportedReason("stream") ?? "unknown"}`,
      );
      const result = await run.wait();
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    for await (const event of run.stream()) {
      if (json) {
        console.log(JSON.stringify(event));
        continue;
      }
      const line = formatMessage(event);
      if (line) console.log(line);
    }

    const result = await run.wait();
    if (!json) {
      console.log("\n--- run finished ---");
      console.log(`status: ${result.status}`);
      if (result.result) console.log(result.result);
    }
  } finally {
    agent.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
