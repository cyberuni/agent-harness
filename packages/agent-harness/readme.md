# @cyberuni/agent-harness

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/cyberuni/agent-harness/blob/main/LICENSE)

Detect which AI agent harness is running — Claude Code, Cursor, Codex, or GitHub Copilot CLI — and
query what it holds: its managed-policy locations, plugin storage, enabled plugins, and how it names
plugin skills.

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

It reports `unknown` instead of guessing:

- when no harness matches, including `CLAUDECODE=1` on its own, which IDE extensions also set;
- when more than one harness matches, as when one harness runs inside another's shell. The matches
  are listed in `candidates`;
- in Codex hook commands, which carry no Codex-specific variable.

Pass `{ env }` to inspect an environment other than `process.env`.

## Why this exists

`universal-plugin`, `buddy-agent-harness`, `repobuddy`, and `cyberlegion/cyber-mux` each need to know
which agent harness they are running under, and each was re-implementing that detection separately.
This package exists so they share one implementation instead.

## License

[MIT](https://github.com/cyberuni/agent-harness/blob/main/LICENSE)
