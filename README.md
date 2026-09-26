# agent-harness

![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

**Status: pre-release.** Nothing here is published yet. The first work is research, not code.

## The problem

Every tool that works across AI coding agents — a plugin installer, a doctor script, a config
migrator — ends up re-detecting which harness it is running under: Claude Code, Cursor, Codex, or
GitHub Copilot CLI. Each does this separately, with its own guesses about env vars, file paths, and
process trees, and each guess decays differently as vendors change their tooling.

`agent-harness` is a zero-runtime-dependency TypeScript library that does this detection once, so
[`universal-plugin`](https://github.com/cyberuni/universal-plugin),
[`buddy-agent-harness`](https://github.com/repobuddy/buddy-agent-harness), `repobuddy`, and
`cyberlegion/cyber-mux` can share one implementation instead of maintaining four.

## Planned API

```ts
import { detectHarness } from '@cyberuni/agent-harness'

const result = detectHarness()
// { harness: 'claude-code' | 'cursor' | 'codex' | 'copilot-cli' | 'unknown', evidence: [...] }
```

Beyond identifying the harness, the library will answer what that harness holds: where it looks for
managed policy, where it stores installed plugins, which plugins are currently enabled, and how it
names a plugin's skills on disk.

## Status

Research first. `detectHarness()` currently ships as a stub that always reports `unknown` — see
[`packages/agent-harness`](packages/agent-harness) — because no detection rule here is backed by
verified vendor behavior yet. That verification is the job of
[`.research/harness-detection`](.research), which does not exist yet either. Read `.research/README.md`
for what is investigated once that topic starts.

## Layout

| Path | Contents |
| --- | --- |
| `packages/agent-harness` | The published library |
| `.research/` | Vendor findings, each claim recorded with a source URL |
| `apps/web` | The documentation site |

## Related

[`universal-plugin`](https://github.com/cyberuni/universal-plugin) builds cross-runtime AI agent
plugins from one canonical manifest; it consumes this library rather than duplicating its own
harness detection. [`buddy-agent-harness`](https://github.com/repobuddy/buddy-agent-harness) sets up
a repository's own agent configuration on the consuming side.

## License

MIT
