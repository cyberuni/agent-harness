# @cyberuni/agent-harness

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/cyberuni/agent-harness/blob/main/LICENSE)

Detect which AI agent harness is running — Claude Code, Cursor, Codex, or GitHub Copilot CLI — and
query what it holds: its managed-policy locations, plugin storage, enabled plugins, and how it names
plugin skills.

**Status: pre-release.** The first real work on this library is research, not code. Until
[`.research/harness-detection`](../../.research/harness-detection) lands, `detectHarness()` is a
stub that always reports `unknown`. Do not depend on it for real detection yet.

## Usage

```ts
import { detectHarness } from '@cyberuni/agent-harness'

const result = detectHarness()
// { harness: 'unknown', evidence: [] }
```

## Why this exists

`universal-plugin`, `buddy-agent-harness`, `repobuddy`, and `cyberlegion/cyber-mux` each need to know
which agent harness they are running under, and each was re-implementing that detection separately.
This package exists so they share one implementation instead.

## License

[MIT](https://github.com/cyberuni/agent-harness/blob/main/LICENSE)
