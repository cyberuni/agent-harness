# @cyberuni/agent-harness

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/cyberuni/agent-harness/blob/main/LICENSE)

Detect which AI agent harness is running — Claude Code, Cursor, Codex, GitHub Copilot CLI, OpenCode,
Kilo Code, Gemini CLI, Qwen Code, GitHub Copilot in VS Code, Cline, Crush, OpenHands, or the Auggie
CLI — and query what it holds: its managed-policy locations, plugin storage, enabled plugins, and
how it names plugin skills.

**Status: pre-release.** Every fact this library encodes rests on
[`.research/harness-detection`](https://github.com/cyberuni/agent-harness/tree/main/.research/harness-detection).

## Detect the harness

```ts
import { detectHarness } from '@cyberuni/agent-harness'

const result = detectHarness()
// {
//   harness: 'claude-code',
//   candidates: ['claude-code'],
//   evidence: [
//     { harness: 'claude-code', signal: 'CLAUDECODE', research: 'E-CC-D1', description: '…' },
//     { harness: 'claude-code', signal: 'CLAUDE_CODE_CHILD_SESSION', research: 'E-CC-D3', description: '…' },
//   ],
// }
```

Detection reads environment variables that each harness sets on the processes it spawns:

| Harness | Detected from |
| --- | --- |
| Claude Code | `CLAUDECODE=1` with `CLAUDE_CODE_CHILD_SESSION=1` or `CLAUDE_CODE_SESSION_ID` |
| Cursor | `CURSOR_AGENT=1`, or `CURSOR_VERSION` with `CURSOR_PROJECT_DIR` in hooks |
| Codex | `CODEX_THREAD_ID` |
| GitHub Copilot CLI | `COPILOT_CLI=1`, `COPILOT_AGENT_SESSION_ID`, or `COPILOT_PLUGIN_ROOT` in hooks |
| OpenCode | `OPENCODE=1` with `OPENCODE_PID` |
| Kilo Code | `KILO=1` with `KILO_PID` |
| Gemini CLI | `GEMINI_CLI=1` |
| Qwen Code | `QWEN_CODE=1` |
| GitHub Copilot in VS Code | `COPILOT_AGENT=1` |
| Cline | `CLINE_ACTIVE=true`, set by the VS Code extension only |
| Crush | `CRUSH=1` |
| OpenHands | `AI_AGENT=openhands`, or `OPENHANDS_EVENT_TYPE` with `OPENHANDS_PROJECT_DIR` in hooks |
| Auggie CLI | `AUGMENT_HOOK_EVENT` with `AUGMENT_PROJECT_DIR`, in hooks only |

It reports `unknown` instead of guessing:

- when no harness matches, including `CLAUDECODE=1` on its own, which IDE extensions also set;
- when more than one harness matches, as when one harness runs inside another's shell. The matches
  are listed in `candidates`;
- for `AGENT` and `AI_AGENT`, which several vendors set (only the exact value `AI_AGENT=openhands`
  counts), and for `OPENCODE=1` alone, which Kilo Code, an OpenCode fork, also sets;
- in contexts where a harness sets nothing of its own: Codex, Gemini CLI, and Qwen Code hooks, Qwen
  Code, Crush, OpenHands, and Auggie MCP servers, Auggie shell commands, and the Cline CLI;
- for harnesses with no verified signal, such as Goose, Antigravity, Rovo Dev, Kiro, Amp, Factory
  Droid, Devin Desktop, and Warp. The research records why for each one.

Pass `{ env }` to inspect an environment other than `process.env`.

## Managed policy

```ts
import { managedPolicyLocations } from '@cyberuni/agent-harness'

managedPolicyLocations('claude-code', { platform: 'linux' })
// [
//   { kind: 'server', location: 'claude.ai admin console or a self-hosted Claude apps gateway', … },
//   { kind: 'file', location: '/etc/claude-code/managed-settings.json', … },
//   { kind: 'directory', location: '/etc/claude-code/managed-settings.d', … },
//   { kind: 'file', location: '/etc/claude-code/managed-mcp.json', … },
// ]
```

`kind` is `file` or `directory` for what a caller can read from disk, `macos-managed-preferences`
or `windows-registry` for MDM delivery, and `server` for policy held by the vendor or the
organization. A `server` entry means the local files are not the whole policy.

## Plugin storage

```ts
import { pluginStorage } from '@cyberuni/agent-harness'

pluginStorage('codex')
// {
//   harness: 'codex',
//   configDir: '/home/me/.codex',
//   locations: [
//     { kind: 'plugin-cache', path: '/home/me/.codex/plugins/cache', … },
//     { kind: 'enabled-record', path: '/home/me/.codex/config.toml', … },
//   ],
// }
```

Paths are computed, not checked, so a location may not exist until the first plugin is installed.
Cursor has no `enabled-record`: no file records which of its plugins are enabled.

## Enabled plugins

```ts
import { enabledPlugins } from '@cyberuni/agent-harness'

const result = await enabledPlugins('claude-code')
// {
//   harness: 'claude-code',
//   supported: true,
//   plugins: [{ id: 'my-plugin@my-marketplace', enabled: true, scope: 'project', source: '/repo/.claude/settings.json' }],
//   sources: [{ scope: 'managed', path: '/etc/claude-code/managed-settings.json', found: false }, …],
//   unread: ['server-managed settings (claude.ai admin console or a self-hosted Claude apps gateway)', …],
//   research: ['E-CC-P3', …],
// }
```

| Harness | Files read, highest precedence first |
| --- | --- |
| Claude Code | managed `managed-settings.json`, `.claude/settings.local.json`, `.claude/settings.json`, `<config dir>/settings.json` |
| Codex | `<config dir>/config.toml` |
| GitHub Copilot CLI | managed `managed-settings.json`, `.github/copilot/settings.local.json`, `.github/copilot/settings.json`, `<config dir>/settings.json` |
| Cursor, OpenCode, Kilo Code, Gemini CLI, Qwen Code, Copilot in VS Code, Cline, Crush, OpenHands, Auggie CLI | none: `supported` is `false` |

Only plugins with an explicit entry are reported. A plugin with no entry falls back to a default
this package does not know. When `unread` is not empty, MDM or server-managed policy can still
override the answer.

## Skill naming and plugin dependencies

```ts
import { skillInvocation, supportsPluginDependencies } from '@cyberuni/agent-harness'

skillInvocation('claude-code', { plugin: 'my-plugin', skill: 'review' })?.text // '/my-plugin:review'
skillInvocation('copilot-cli', { plugin: 'my-plugin', skill: 'review' })?.text // '/review'
skillInvocation('codex', { plugin: 'my-plugin', skill: 'review' })?.text // '$review'
skillInvocation('gemini-cli', { plugin: 'my-plugin', skill: 'review' }) // undefined: the model loads skills itself

supportsPluginDependencies('claude-code') // true; false for the others
```

## Why this exists

`universal-plugin`, `buddy-agent-harness`, `repobuddy`, and `cyberlegion/cyber-mux` each need to know
which agent harness they are running under, and each was re-implementing that detection separately.
This package exists so they share one implementation instead.

## License

[MIT](https://github.com/cyberuni/agent-harness/blob/main/LICENSE)
