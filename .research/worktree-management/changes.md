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
