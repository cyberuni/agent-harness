# Evidence — Worktree management

Confidence: **High** means a vendor page or a source read states it. **Medium** means it is read
from a README or implied. **Low** means indirect.

## Our tools

| ID | Claim | Source | Date | Confidence |
|---|---|---|---|---|
| E-MUX-1 | `resolvePrimaryRoot` runs `git rev-parse --path-format=absolute --git-common-dir` and takes its dirname; `listWorktreesFromGit` parses `git worktree list --porcelain` | cyberuni/cyber-mux `packages/cyber-mux/src/worktree.ts` l.171, l.198 | 2026-10-05 | High — source |
| E-MUX-2 | `resolveWorktreePath(primary, name)` returns `<parent>/<basename(primary)>.worktrees/<name>`; the CLI passes the branch as the name, so a branch with `/` nests directories | `worktree.ts` l.539, `cli.ts` | 2026-10-05 | High — source |
| E-MUX-3 | `isWorktreeRemovable` = linked, not prunable, merged, not dirty, no bound workspace; no lease or holder concept | `worktree.ts` l.506 | 2026-10-05 | High — source |
| E-MUX-4 | Merged detection layers: `branch --merged <target>`, upstream `[gone]`, squash probe via `commit-tree` + `git cherry`, opt-in `gh pr list --state merged`; target is `origin/HEAD` then the primary's branch | `worktree.ts` l.265, l.341 | 2026-10-05 | High — source |
| E-MUX-5 | `removeWorktreeSafely` refuses the primary (no force override) and a dirty tree unless forced; `git worktree remove --force` always passed; `pruneWorktrees` skips prunable entries instead of running `git worktree prune` | `worktree.ts` l.525, l.566, l.633 | 2026-10-05 | High — source |
| E-MUX-6 | `provisionWorktree` reuses the first entry an injectable `available` predicate clears (default `isWorktreeRemovable`), recycling with `switch -c`, `reset --hard`, `clean -fdx`; the old branch is not deleted | `worktree.ts` l.706, l.737 | 2026-10-05 | High — source |
| E-MUX-7 | herdr only binds a worktree to a workspace when herdr's own `worktree create`/`open` made it; removal stays with cyber-mux | `src/mux.herdr.ts` l.1008-1075, `src/mux.ts` l.501-580 | 2026-10-05 | High — source |
| E-MUX-8 | Measured `git worktree add` ~0.05 s / ~4 MiB versus `pnpm install` ~3.4 s / ~24 MiB | cyberuni/cyber-mux#190 | 2026-10-05 | High — issue record |
| E-LEG-1 | `resolveUnitWorktreePath` = `<parent>/<repo>.worktrees/legion-<id6>`; branch `cyberlegion/unit-<id>` | cyberuni/cyberlegion `packages/cyberlegion/src/paths.ts` l.162, `session.ts` l.203 | 2026-10-05 | High — source |
| E-LEG-2 | `spawn` always creates (never calls `provisionWorktree`); `decommission --keep-worktree` retains the checkout "so a pool can detach it and hand it to the next unit" | `session.ts` l.148-260, `decommission.ts` | 2026-10-05 | High — source |
| E-LEG-3 | Dirty check uses `--untracked-files=all` and ignores its own `.agents/cyberlegion/config.json` marker | `decommission.ts` | 2026-10-05 | High — source |
| E-FLEET-1 | cyberfleet has no worktree code; ADR-0023 plans Pods "into pooled worktrees provisioned through the runtime's workspace adapter"; the stations plan wants one write-lease per ship worktree | cyberuni/cyberfleet ADR-0023, `.agents/plans/cyberfleet-stations.plan.md` l.31 | 2026-10-05 | High — source |

## Treehouse (kunchenguid/treehouse v3.x)

| ID | Claim | Source | Date | Confidence |
|---|---|---|---|---|
| E-TH-1 | Pool with durable leases (random `lease_id`, holder) in one JSON state file under an exclusive `flock`; release is conditional on lease id/holder | `internal/pool/state.go`, `cmd/get.go` | 2026-10-05 | High — source |
| E-TH-2 | A slot is acquirable only if not destroying/leased/owned by a live PID, has a VCS marker, belongs to this clone (same common dir), no process cwd inside, clean (`--untracked-files=all`), and HEAD merged into the reset target (ancestor, then squash tree compare); errors fail closed | `internal/pool/pool.go` ~l.373-560 | 2026-10-05 | High — source |
| E-TH-3 | Reset holds git's `HEAD.lock` (O_EXCL), re-checks HEAD, runs `git read-tree --reset -u <ref>` then `git clean -fd` (no `-x`), leaving HEAD detached | `internal/vcs/gitvcs/gitvcs.go` | 2026-10-05 | High — source |
| E-TH-4 | Hooks only from user-level config (repo hooks ignored); `.worktreeinclude` read from committed HEAD, copies recorded in state for exact undo | `internal/config/config.go`, `internal/hooks/hooks.go` | 2026-10-05 | High — source |
| E-TH-5 | Fetches `origin` on every `get` unless `--no-fetch`; scans the process table and kills lingering processes on return | `cmd/get.go`, `internal/process/detect.go` | 2026-10-05 | High — source |
| E-TH-7 | Slot names are monotonic integers, stable for the slot's life; default path `~/.treehouse/<repo>-<hash>/<slot>/<repo>` | `internal/pool/pool.go`, `internal/pool/worktree_path.go` | 2026-10-05 | High — source |
| E-TH-6 | No importable API; everything is `internal/*` behind a CLI | repository layout | 2026-10-05 | High — source |

## Other tools

| ID | Claim | Source | Date | Confidence |
|---|---|---|---|---|
| E-OTHER-1 | Worktrunk, git-worktree-runner, vibe-kanban, and Crystal key worktrees by branch or task and do not reuse idle ones | GitHub READMEs of max-sixty/worktrunk, coderabbitai/git-worktree-runner, BloopAI/vibe-kanban, stravu/crystal | 2026-10-05 | Medium — README only |

## Harnesses

| ID | Claim | Source | Date | Confidence |
|---|---|---|---|---|
| E-CC-W1 | Claude Code worktrees live at `<repo>/.claude/worktrees/<name>` on branch `worktree-<name>` | https://code.claude.com/docs/en/worktrees | 2026-10-05 | High — vendor doc |
| E-CC-W2 | `.worktreeinclude` (gitignore syntax) copies matching gitignored files into a new worktree; not processed when a `WorktreeCreate` hook is set | https://code.claude.com/docs/en/worktrees | 2026-10-05 | High — vendor doc |
| E-CC-W3 | Claude Code writes a marker into the git metadata of worktrees it creates; the sweep keeps any worktree without one. The marker's name is undocumented | https://code.claude.com/docs/en/worktrees | 2026-10-05 | High for existence; name unknown |
| E-CC-W4 | Claude Code holds `git worktree lock` while an agent runs; its sweep releases only locks it set, never user locks | https://code.claude.com/docs/en/worktrees | 2026-10-05 | High — vendor doc |
| E-CC-W5 | `WorktreeCreate` hook: stdin JSON with `base_path`, `worktree_path`, `ref`, `isolation_reason`; a command hook prints the absolute path on stdout; the path must lie outside any git repository. `WorktreeRemove` gets `base_path`, `worktree_path`, `removal_reason` | https://code.claude.com/docs/en/hooks | 2026-10-05 | High — vendor doc; `name` field disputed between pages |
| E-CUR-W1 | Cursor setup via `.cursor/worktrees.json` (`setup-worktree[-unix|-windows]`, `$ROOT_WORKTREE_PATH`); cleanup every `cursor.worktreeCleanupIntervalHours` (6), cap `cursor.worktreeMaxCount` (25); root `~/.cursor/worktrees` | https://cursor.com/docs/configuration/worktrees; root from forum | 2026-10-05 | High for config; Low for root |
| E-CODEX-W1 | Codex app worktrees under `$CODEX_HOME/worktrees` (root configurable), detached HEAD by default, ~15 kept, snapshot before delete | https://learn.chatgpt.com/docs/environments/git-worktrees | 2026-10-05 | High — vendor doc |
| E-COP-W1 | Copilot CLI v1.0.71-1 added local `/worktree`; layout undocumented. `/delegate` uses a remote branch, no local worktree | https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/delegate-tasks-to-cca, release notes | 2026-10-05 | Medium |
| E-HERDR-W1 | herdr has `herdr worktree create/open/list`; path and branch scheme not documented | https://github.com/ogulcancelik/herdr; cyber-mux usage (E-MUX-7) | 2026-10-05 | Medium |
