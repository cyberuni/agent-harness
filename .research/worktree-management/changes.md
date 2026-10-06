# Changes

## 2026-10-05 — created

Opened to design a worktree library that cyber-mux, cyberlegion, and cyberfleet can share, with
idle-worktree reuse as the firm requirement.

## 2026-10-05 — owners and occupants

Split ownership (one lease) from occupancy (any number of sessions), after the requirement that a
Captain or Pod's worktree can host subagents, judges, and watchers at once with no limit imposed by
the library. A live agent session now marks a worktree busy; a dev service does not, and orphaned
dev services are reported as lingering. Added open questions on recognising a harness's session
process.

## 2026-10-05 — discovery only

Dropped registered occupants. The lease is the only record the library writes; occupants are found
by the process probe. Registration covered only sessions the probe cannot see, and those matter
only in an unowned worktree, which was judged acceptable. Release no longer recycles; the next
acquire does, after the probe.

## 2026-10-05 — library-assigned names

The library assigns each worktree's directory name (lowest unused number) and the caller cannot
choose it, because a meaningful name misleads once the worktree is reused. Added an open question on
harness state keyed by path.

## 2026-10-05 — `<repo>-<n>` basename

Worktree directories are `<repo>.worktrees/<repo>-<n>`, so a tool that shows only the folder name
still names the repo.

## 2026-10-05 — lease spike

Ran the lease spike against git 2.56.0 and read `lock_worktree` in git's source. An exclusively
created `locked` file works as a lease. `git worktree lock` can overwrite it in a narrow race, so
the design reads the lease back after claiming and before destructive steps. Added E-GIT-L1 to L6.

## 2026-10-05 — session processes

Ran Claude Code, Codex, and Copilot CLI headless and read `/proc` (E-PROC-*). A session is
recognised by its executable, not its environment, because nested sessions inherit tool markers.
Lingering services are linked by ancestry and session-id variables. Recorded path-keyed harness
state and Claude Code's lock-reason format. Cursor's tool environment remains untested.

## 2026-10-05 — Cursor session processes

Re-ran the Cursor experiment logged in (E-PROC-CUR3, E-PROC-CUR4). Cursor's worker shares the
session's exe and argv and outlives it, so the probe excludes it by its `AGENT_CLI_*` environment.
`CURSOR_CONVERSATION_ID` links orphans to their session.
