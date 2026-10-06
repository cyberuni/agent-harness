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
| Sibling layout `<parent>/<repo>.worktrees/<repo>-<n>`; the library assigns `<n>`, never the caller | mux, legion; decision 2026-10-05 | E-MUX-2, E-LEG-1 |
| Merged detection: ancestor, upstream gone, squash-patch, optional forge probe | mux, fleet | E-MUX-4 |
| Dirty check with an ignore list for tool-owned marker files | mux, legion | E-MUX-5, E-LEG-3 |
| Refuse the primary checkout, with no force override | mux, legion | E-MUX-5 |
| Safe remove and bulk prune with dry run and skip reasons | mux, legion, fleet | E-MUX-5 |
| Reuse an idle worktree instead of creating one | mux, legion, fleet | E-MUX-6, E-LEG-2, E-FLEET-1 |
| Keep a worktree when its unit closes, for the next unit | legion, fleet | E-LEG-2 |
| A caller-supplied creator, so herdr can create and bind the worktree | mux, legion | E-MUX-7 |
| One owner per worktree, many concurrent sessions (implementer, judge, doc watcher) | fleet, user requirement 2026-10-05 | E-FLEET-1 |
| A live agent session marks a worktree busy; a dev service does not | user requirement 2026-10-05 | — |
| Report dev services left behind (vite, vitest) | user requirement 2026-10-05 | — |

## Recommended design (not yet built)

- **Ownership and occupancy are separate facts.** A worktree has at most one *owner* (a lease),
  such as a cyberfleet Captain or Pod. It can have any number of *occupants*: the owner's
  subagents, a reviewer or judge session, a watcher that updates docs. The library never limits how
  many there are, what role they play, or who may write. Coordinating writers is the caller's job.
- **Lease = git's worktree lock (verified, E-GIT-L1 to L6).** Claim a worktree by exclusive-creating
  `$GIT_COMMON_DIR/worktrees/<id>/locked` with a one-line JSON reason naming the library, a lease
  ID, and the holder. git then refuses to lock, remove, move, or prune it (E-GIT-L3), and Claude
  Code's sweep never releases a lock it did not set (E-CC-W4). The lease is the only record the
  library writes. Consequences for the design:
  - Two library callers exclude each other through the exclusive create (E-GIT-L1).
  - `git worktree lock` is check-then-truncate, not exclusive (E-GIT-L5). In the window between
    its check and its write it can overwrite our lease. After claiming, read the file back and
    confirm the lease ID; confirm it again before any destructive step.
  - `git worktree unlock` or `remove -f -f` breaks a lease (E-GIT-L4). That is the user's manual
    override, not a bug: `release` reports a lease it no longer holds as lost instead of failing,
    and the library itself never passes `-f -f`.
  - Write the reason on one line; git C-quotes it in porcelain output (E-GIT-L2).
- **A live agent session makes a worktree busy; a dev service does not.** Occupants are discovered,
  not registered: an injectable process probe finds harness session processes whose working
  directory is inside the worktree. It must tell a harness's own session process from the tool
  subprocesses the harness spawns: a `vite` or `vitest` launched from Claude Code's Bash tool
  inherits `CLAUDECODE=1` but also carries `CLAUDE_CODE_CHILD_SESSION=1` (E-CC-D1, E-CC-D3), so
  environment alone would misread it as a session. How to recognise each harness's session process
  is unresearched; until it is, the probe reports `unknown` for that harness. Busy is its own
  status, not folded into `dirty`.
  - *Why no registration.* Registration would only cover sessions discovery cannot see: a session
    whose working directory is outside the worktree, one across a WSL, container, or remote
    boundary, or a harness or platform the probe cannot read. Busy only gates recycle and remove,
    and an owned worktree is already protected by its lease whatever runs inside it. So a blind spot
    matters only for an unowned worktree holding an unseen session, which was judged not to matter
    (decision 2026-10-05). Sessions in unowned worktrees, such as a user running `claude` there, are
    the ones nobody would register anyway.
  - *Release does not recycle.* An owner may release while its judge or watcher still runs.
    Recycling happens at the next `acquire`, after the probe.
  - *Probe returns `unknown`.* Reuse proceeds, and the skip report marks the worktree unverified;
    a caller can opt into the stricter rule.
- **Lingering dev services are reported, never killed.** Processes inside the worktree that are not
  agent sessions (dev servers, test watchers) do not block reuse. When no live session launched
  them, the library lists them as lingering so a caller can reclaim the resources. Shutting
  sessions and services down belongs to the caller; for Captains and Pods that is cyberfleet.
- **Availability is a fail-closed predicate with reasons,** checked in this order: ours, not locked,
  not prunable, clean with `--untracked-files=all`, HEAD merged into the reset target (E-TH-2).
  Re-check after the claim.
- **The library names worktrees; the name means nothing.** The path is
  `<parent>/<repo>.worktrees/<repo>-<n>`, where `<n>` is the lowest unused number and the `<repo>-` prefix keeps the basename identifiable in tools that show only the folder name, and it never changes
  for the worktree's life. A caller-chosen name (cyber-mux passes the branch, E-MUX-2; cyberlegion
  passes `legion-<id6>`, E-LEG-1) describes the first task and misleads every later one once the
  worktree is reused (decision 2026-10-05). What the worktree is for lives in its branch and its
  lease holder, both of which change on reuse. Treehouse names slots the same way (E-TH-7).
- **Recycle without `-x`.** `read-tree --reset -u <base>` then `clean -fd` keeps `node_modules`
  (E-TH-3). cyber-mux's `clean -fdx` throws away the install reuse is meant to save (E-MUX-6,
  E-MUX-8).
- **No repo-supplied shell.** Setup hooks are callbacks. Copying from `.worktreeinclude` is optional
  and records what it copied (E-TH-4, E-CC-W2).
- **No implicit fetch, no killing.** Process inspection is a pluggable probe, never a kill
  (E-TH-5).

## Open questions

- The Claude Code worktree marker file name (E-CC-W3 says only that one exists).
- herdr's worktree path and branch scheme; read its source.
- Copilot CLI local `/worktree` layout.
- How to recognise each harness's session process (executable, arguments, environment) as distinct
  from the tool subprocesses it spawns, on Linux, macOS, and Windows. Needed by the process probe.
- Whether a harness keys per-project state by the worktree's path (for example Claude Code's
  project transcripts and memory), so that a reused path carries one task's history into the next.
- Whether a harness changes its own process working directory when it enters a worktree (Claude
  Code `EnterWorktree`), which decides whether the probe sees it.
