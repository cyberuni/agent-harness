---
title: Harness detection
description: How agent-harness identifies which AI agent harness is running, and when it answers unknown.
---

`detectHarness()` reads environment variables that each harness sets on the processes it spawns.
Every rule rests on a vendor source recorded in
[`.research/harness-detection`](https://github.com/cyberuni/agent-harness/tree/main/.research/harness-detection),
and every piece of evidence it returns names the research claim behind it.

## What each harness sets

A harness does not set the same variables everywhere it runs code. Your code can run in three
places: a command the agent runs in a shell or terminal, a hook the harness fires, or an MCP server
the harness starts. The table shows what identifies each harness in each place. A dash means no
rule applies there, so detection reports `unknown`.

| Harness | Commands the agent runs | Hooks | MCP servers |
| --- | --- | --- | --- |
| Claude Code | `CLAUDECODE=1` with `CLAUDE_CODE_CHILD_SESSION=1` or `CLAUDE_CODE_SESSION_ID` | Same as commands; also the status line | `CLAUDECODE=1` with `CLAUDE_CODE_SESSION_ID` (stdio servers) |
| Cursor | `CURSOR_AGENT=1` | `CURSOR_VERSION` with `CURSOR_PROJECT_DIR` | — |
| Codex | `CODEX_THREAD_ID` | — | — |
| GitHub Copilot CLI | `COPILOT_CLI=1` or `COPILOT_AGENT_SESSION_ID` | `COPILOT_PLUGIN_ROOT` (plugin hooks) | `COPILOT_CLI=1` or `COPILOT_AGENT_SESSION_ID` |
| OpenCode | `OPENCODE=1` with `OPENCODE_PID` | — | `OPENCODE=1` with `OPENCODE_PID` |
| Kilo Code | `KILO=1` with `KILO_PID` | — | `KILO=1` with `KILO_PID` |
| Gemini CLI | `GEMINI_CLI=1` | — | `GEMINI_CLI=1` |
| Qwen Code | `QWEN_CODE=1` | — | — |
| GitHub Copilot in VS Code | `COPILOT_AGENT=1` | — | — |
| Cline | `CLINE_ACTIVE=true` (VS Code extension only) | — | — |

## When the answer is unknown

The library reports `unknown` rather than guess:

- **`CLAUDECODE=1` on its own.** Claude Code's IDE extensions set it in their integrated
  terminals, where a person, not the agent, runs commands.
- **Borrowed names.** Codex, Copilot CLI, and Cursor pass `CLAUDE_PLUGIN_ROOT`,
  `CLAUDE_PLUGIN_DATA`, or `CLAUDE_PROJECT_DIR` to hooks for compatibility, so those names prove
  nothing.
- **Shared names.** OpenCode and Kilo Code set `AGENT=1`, and VS Code and Claude Code set
  `AI_AGENT`. These say that some agent is running, not which one.
- **Nested harnesses.** A harness started from another harness's shell inherits the outer
  harness's variables. With signals from two harnesses present, the environment cannot say which
  one is innermost. `candidates` lists both.
- **Contexts with no marker of their own.** Codex, Gemini CLI, and Qwen Code hooks, Qwen Code MCP
  servers, Copilot in VS Code hooks and MCP servers, and the Cline CLI carry no variable that names
  the harness.

## Forks

A fork inherits its parent's code, and sometimes its variables. Kilo Code still sets OpenCode's
`OPENCODE=1`, but not `OPENCODE_PID`, which OpenCode's rule requires, so Kilo Code is read as Kilo
Code. Kilo Code started from an OpenCode shell carries both, which is nesting and gives `unknown`.
Qwen Code renamed Gemini CLI's variable to `QWEN_CODE`, so the two never overlap.

## Beyond detection

The same research backs the harness queries:

- `managedPolicyLocations()` lists the managed-policy files, MDM domains, registry keys, and
  server-side sources for each harness.
- `pluginStorage()` returns where plugins are installed and where the enabled record lives.
- `enabledPlugins()` reads the enabled record for Claude Code, Codex, and Copilot CLI, and names
  the policy sources it cannot read. The other harnesses keep no boolean record it can read.
- `skillInvocation()` returns what a user types to run a plugin skill, or `undefined` where the
  model loads skills itself: OpenCode, Kilo Code, Gemini CLI, and Qwen Code.
