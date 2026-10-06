---
"@cyberuni/agent-harness": minor
---

Add the `@cyberuni/agent-harness/worktrees` subpath. It has three entry points:

- `primaryRoot` finds the primary checkout from any folder in a repository, including a linked worktree.
- `listWorktrees` lists every worktree with its branch, HEAD, detached, prunable and lock reason, plus whether its work has landed on the default branch and whether it is dirty.
- `readDirty` checks a worktree for uncommitted changes, can ignore paths you name, and counts untracked files even when a repo hides them.

Landed detection tries, in order: ancestry, a deleted upstream, a squash merge matched by patch id, and an opt-in forge probe (`ghForgeMergedProbe`).
