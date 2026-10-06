---
"@cyberuni/agent-harness": minor
---

Add `pruneWorktrees` to `@cyberuni/agent-harness/worktrees`. It removes the worktrees this library owns that nothing needs any more (unleased, idle, clean, and landed), then runs `git worktree prune`. It is a dry run unless `apply` is set, and returns an outcome per worktree with a skip reason. It never touches the primary checkout, a foreign or locked worktree, a leased one, or one with a live agent session; when the process probe cannot read the platform it skips unless `strict: false`. It never kills a process: lingering dev services are reported so the caller can reclaim them.
