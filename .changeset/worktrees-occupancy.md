---
"@cyberuni/agent-harness": minor
---

Add a process probe to `@cyberuni/agent-harness/worktrees` that finds live agent sessions inside a worktree. It never kills anything.

- `probeProcesses` reads the process table once. Its `occupancy(root)` reports `busy`, the `occupants` (every live session, with no limit on how many), the `lingering` processes, and the `unlinked` ones. Lingering means no live session launched the process, so a caller can reclaim it. Unlinked means the probe cannot tell.
- `occupants(root)` lists the sessions working in one worktree.
- A session is recognised by its executable, so tool subprocesses such as a `vite` started from Claude Code are not sessions. 14 harnesses are covered: Claude Code, Codex, Copilot CLI, Cursor, opencode, Kilo, Qwen Code, Crush, Gemini CLI, Goose, OpenHands, Cline, Auggie, and the Antigravity CLI.
- The process source can be swapped out. `procfsProcessSource` reads Linux `/proc`. On any other platform the probe is unverified and reports not busy, unless you pass `strict: true`.
