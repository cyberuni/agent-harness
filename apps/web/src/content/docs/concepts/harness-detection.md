---
title: Harness detection
description: How agent-harness identifies which AI agent harness is running, and when it answers unknown.
---

`detectHarness()` reads environment variables that each harness sets on the processes it spawns.
Every rule rests on a vendor source recorded in
[`.research/harness-detection`](https://github.com/cyberuni/agent-harness/tree/main/.research/harness-detection),
and every piece of evidence it returns names the research claim behind it.

## What each harness sets

| Harness | Detected from | Where it is set |
| --- | --- | --- |
| Claude Code | `CLAUDECODE=1` with `CLAUDE_CODE_CHILD_SESSION=1` | Tool subprocesses, hooks, status line |
| Claude Code | `CLAUDECODE=1` with `CLAUDE_CODE_SESSION_ID` | Also stdio MCP servers |
| Cursor | `CURSOR_AGENT=1` | Terminal commands the agent runs |
| Cursor | `CURSOR_VERSION` with `CURSOR_PROJECT_DIR` | Hook commands |
| Codex | `CODEX_THREAD_ID` | Shell tool commands |
| GitHub Copilot CLI | `COPILOT_CLI=1` or `COPILOT_AGENT_SESSION_ID` | Shell commands, MCP servers |
| GitHub Copilot CLI | `COPILOT_PLUGIN_ROOT` | Plugin hooks |

## When the answer is unknown

The library reports `unknown` rather than guess:

- **`CLAUDECODE=1` on its own.** Claude Code's IDE extensions set it in their integrated
  terminals, where a person, not the agent, runs commands.
- **Borrowed names.** Codex, Copilot CLI, and Cursor pass `CLAUDE_PLUGIN_ROOT`,
  `CLAUDE_PLUGIN_DATA`, or `CLAUDE_PROJECT_DIR` to hooks for compatibility, so those names prove
  nothing.
- **Nested harnesses.** A harness started from another harness's shell inherits the outer
  harness's variables. With signals from two harnesses present, the environment cannot say which
  one is innermost. `candidates` lists both.
- **Codex hooks.** Codex gives hook commands only plugin-root variables, so a Codex hook cannot be
  identified.

## Beyond detection

The same research backs the harness queries:

- `managedPolicyLocations()` lists the managed-policy files, MDM domains, registry keys, and
  server-side sources for each harness.
- `pluginStorage()` returns where plugins are installed and where the enabled record lives.
- `enabledPlugins()` reads the enabled record for Claude Code, Codex, and Copilot CLI, and names
  the policy sources it cannot read. Cursor keeps no such record.
- `skillInvocation()` returns what a user types to run a plugin skill.
