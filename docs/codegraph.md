# CodeGraph MCP

CodeGraph is optional development tooling that helps coding agents narrow repository context before broad exploration. It is not part of the Gonezo runtime, a build dependency, a source of architectural truth, or a requirement for CI or tests.

## Source of truth

The authoritative sources remain:

1. Gonezo source code.
2. Gonezo architecture and domain documentation.
3. `AGENTS.md` and `.agents/skills`.

CodeGraph is a derived index used for discovery only. Agents must read the actual source before editing.

## WSL setup

Run CodeGraph and Codex inside WSL, with Gonezo stored in the WSL Linux filesystem, for example:

```text
~/projects/gonezo
```

Do not use a checkout under `/mnt/c/...`.

Install the currently tested integration version:

```bash
npm install -g @astudioplus/codegraph-mcp@0.20.1
```

If the native engine is unavailable, fetch it with:

```bash
npx codegraph-mcp-fetch-engine
```

## Codex configuration

Resolve the WSL executable instead of guessing its path:

```bash
command -v codegraph-mcp
```

Add one CodeGraph server to `~/.codex/config.toml`, replacing the placeholder with that command's absolute path:

```toml
[mcp_servers.codegraph]
command = "<ABSOLUTE_PATH_FROM_command_-v>"
args = ["--profile", "core"]
enabled = true

[mcp_servers.codegraph.env]
CODEGRAPH_TELEMETRY = "off"
```

Do not configure a fixed Gonezo workspace path; the Codex process working directory lets each checkout or worktree index itself. Restart Codex after changing its MCP configuration.

## Normal workflow

```text
task
→ query CodeGraph
→ identify relevant symbols/files
→ load applicable Gonezo skills/contracts
→ read actual source
→ edit
→ run normal Gonezo verification
```

## Failure behavior

CodeGraph must never block development. If it is unavailable, incomplete, stale or inconsistent, or cannot resolve the task, continue with normal repository search and direct inspection.

## Troubleshooting

```bash
command -v codegraph-mcp
codegraph-mcp --help
npx codegraph-mcp-fetch-engine
```

Restart Codex after MCP configuration changes. If results appear stale, reindex and query again. If indexing fails, fall back to direct repository inspection. CodeGraph indexes and runtime state are local and must not be committed to Gonezo.
