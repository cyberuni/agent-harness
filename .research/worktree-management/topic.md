# Topic — Worktree management

## Why this topic exists

cyber-mux carries worktree logic that cyberlegion and cyberfleet also need, and herdr manages its
own worktrees. The logic should be usable without cyber-mux, as a library rather than a service or
a shell. The one firm requirement is to find an idle worktree and reuse it instead of creating a
new one each time. A pool is welcome but not required.

The answer is in [conclusion.md](./conclusion.md).

## Method

Three investigations ran in parallel on 2026-10-05:

1. A source read of cyber-mux, cyberlegion, and cyberfleet for every worktree operation, the git
   commands behind it, and the related issues and ADRs.
2. A source read of kunchenguid/treehouse, plus README-level checks of Worktrunk,
   git-worktree-runner, vibe-kanban, and Crystal.
3. Vendor documentation for how Claude Code, Cursor, Codex, GitHub Copilot CLI, and herdr create,
   mark, and clean up their own worktrees.

## Findings in brief

- cyber-mux's `worktree.ts` is already a pure git layer with an injected `exec`. It has reuse
  (`provisionWorktree`) but decides availability only from merged-and-clean, so it cannot tell an
  idle worktree from one an agent is using.
- cyberlegion creates a new worktree per unit and can keep it on close, but nothing picks the kept
  worktree up again.
- cyberfleet plans pooled worktrees and a single write-lease per ship, with no code yet.
- Treehouse solves reuse with leases, a fail-closed availability check, a reset that keeps ignored
  files, and crash quarantine. It ships only a CLI, fetches and scans processes by default, and has
  grown many options.
- Each harness owns its worktrees differently. Claude Code is the only one with a documented lock
  and marker; the others rely on a central directory.

## Lease storage options considered

1. git's per-worktree `locked` file, created exclusively, with a structured reason. No second
   source of truth, visible to git and other tools, per-worktree granularity. Chosen, pending a
   spike.
2. A treehouse-style state file with a file lock. More room for metadata, but a second source of
   truth and a repo-wide serialization point.

A spike to confirm option 1 was not run in this session.
