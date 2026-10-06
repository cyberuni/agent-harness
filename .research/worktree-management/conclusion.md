# Conclusion — Worktree management (October 2026)

## Last updated

2026-10-05. Sources: cyber-mux, cyberlegion, and cyberfleet read at their `main` heads on
2026-10-05; kunchenguid/treehouse v3.x read from source; vendor worktree docs for Claude Code,
Cursor, Codex, and GitHub Copilot CLI.

## Question

What do our tools (cyber-mux, cyberlegion, cyberfleet) and coding agents need from a worktree
library, how do existing tools and harnesses manage worktrees, and how should a library find an
idle worktree and reuse it instead of creating a new one each time?

## Verdict

**The git layer already exists in cyber-mux (`cyber-mux/worktree`). What is missing is a lease.**
Today a worktree counts as "available" when it is merged, clean, and has no bound workspace
(E-MUX-3, E-MUX-6). Nothing records that an agent holds it, so two callers can recycle the same
worktree. cyberlegion never calls the reuse path at all (E-LEG-2). Treehouse is the only tool
checked that reuses worktrees, and it does so with explicit leases (E-TH-1). The others create one
worktree per branch and discard it (E-OTHER-1).

**A worktree that another tool owns must never be reused or removed.** Claude Code locks the
worktrees it runs in and marks them in git metadata (E-CC-W3, E-CC-W4). Cursor and Codex keep
theirs under central roots and sweep them on their own schedule (E-CUR-W1, E-CODEX-W1). The
Copilot CLI and herdr worktree layouts are not documented well enough to recognise (E-COP-W1,
E-HERDR-W1), so the library reports `unknown` for them.

## What our tools need

| Need | Who | Evidence |
| --- | --- | --- |
| Resolve the primary checkout from any linked worktree | mux, legion, fleet | E-MUX-1 |
| List worktrees from `git worktree list --porcelain` | mux, legion, fleet | E-MUX-1 |
| Sibling layout `<parent>/<repo>.worktrees/<name>` with a caller-chosen name | mux, legion | E-MUX-2, E-LEG-1 |
| Merged detection: ancestor, upstream gone, squash-patch, optional forge probe | mux, fleet | E-MUX-4 |
| Dirty check with an ignore list for tool-owned marker files | mux, legion | E-MUX-5, E-LEG-3 |
| Refuse the primary checkout, with no force override | mux, legion | E-MUX-5 |
| Safe remove and bulk prune with dry run and skip reasons | mux, legion, fleet | E-MUX-5 |
| Reuse an idle worktree instead of creating one | mux, legion, fleet | E-MUX-6, E-LEG-2, E-FLEET-1 |
| Keep a worktree when its unit closes, for the next unit | legion, fleet | E-LEG-2 |
| A caller-supplied creator, so herdr can create and bind the worktree | mux, legion | E-MUX-7 |
| One writer per worktree at a time | fleet (planned) | E-FLEET-1 |

## Recommended design (not yet built)

- **Lease = git's worktree lock.** Claim a worktree by exclusive-creating
  `$GIT_COMMON_DIR/worktrees/<id>/locked` with a reason naming the library, a lease ID, and the
  holder. git then refuses to remove or prune it, and Claude Code's sweep never releases a lock it
  did not set (E-CC-W4). Whether git tolerates a structured reason, and whether the exclusive create
  holds against `git worktree lock`, is unverified: spike it before building on it.
- **Availability is a fail-closed predicate with reasons,** checked in this order: ours, not locked,
  not prunable, clean with `--untracked-files=all`, HEAD merged into the reset target (E-TH-2).
  Re-check after the claim.
- **Recycle without `-x`.** `read-tree --reset -u <base>` then `clean -fd` keeps `node_modules`
  (E-TH-3). cyber-mux's `clean -fdx` throws away the install reuse is meant to save (E-MUX-6,
  E-MUX-8).
- **No repo-supplied shell.** Setup hooks are callbacks. Copying from `.worktreeinclude` is optional
  and records what it copied (E-TH-4, E-CC-W2).
- **No implicit fetch, no process scanning, no killing.** These belong to the caller (E-TH-5).

## Open questions

- The Claude Code worktree marker file name (E-CC-W3 says only that one exists).
- herdr's worktree path and branch scheme; read its source.
- Copilot CLI local `/worktree` layout.
