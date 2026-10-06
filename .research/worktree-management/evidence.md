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
| E-CC-W6 | `.worktreeinclude` sits at the project root; only files matching a pattern and gitignored are copied, so tracked files never are. A pattern starting with `**/` reaches into a wholly ignored directory only when that directory matches the pattern or the pattern's first name after `**/` is in the directory's path (since v2.1.239) | https://code.claude.com/docs/en/worktrees | 2026-10-05 | High — vendor doc |
| E-CUR-W1 | Cursor setup via `.cursor/worktrees.json` (`setup-worktree[-unix|-windows]`, `$ROOT_WORKTREE_PATH`); cleanup every `cursor.worktreeCleanupIntervalHours` (6), cap `cursor.worktreeMaxCount` (25); root `~/.cursor/worktrees` | https://cursor.com/docs/configuration/worktrees; root from forum | 2026-10-05 | High for config; Low for root |
| E-CODEX-W1 | Codex app worktrees under `$CODEX_HOME/worktrees` (root configurable), detached HEAD by default, ~15 kept, snapshot before delete | https://learn.chatgpt.com/docs/environments/git-worktrees | 2026-10-05 | High — vendor doc |
| E-COP-W1 | Copilot CLI v1.0.71-1 added local `/worktree`; layout undocumented. `/delegate` uses a remote branch, no local worktree | https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/delegate-tasks-to-cca, release notes | 2026-10-05 | Medium |
| E-HERDR-W1 | herdr has `herdr worktree create/open/list`; path and branch scheme not documented | https://github.com/ogulcancelik/herdr; cyber-mux usage (E-MUX-7) | 2026-10-05 | Medium |

## Lease spike (git 2.56.0, Linux/WSL, 2026-10-05)

| ID | Claim | Source | Date | Confidence |
|---|---|---|---|---|
| E-GIT-L1 | Exclusive-creating `$GIT_COMMON_DIR/worktrees/<id>/locked` (Node `writeFileSync` flag `wx`) with a one-line JSON reason makes git treat the worktree as locked; a second `wx` create fails with `EEXIST` | direct experiment, git 2.56.0 | 2026-10-05 | High — direct observation |
| E-GIT-L2 | `git worktree list --porcelain` prints the reason as `locked "<C-quoted reason>"`; JSON quotes are escaped and a newline appears as `\n`, so a one-line reason round-trips | direct experiment, git 2.56.0 | 2026-10-05 | High — direct observation |
| E-GIT-L3 | On a worktree locked this way, `git worktree lock` fails (`already locked`, exit 128) and leaves the file intact; `git worktree remove` and `remove -f` refuse; `move` refuses; `prune` keeps the entry even when the directory is gone | direct experiment, git 2.56.0 | 2026-10-05 | High — direct observation |
| E-GIT-L4 | `git worktree remove -f -f` removes a locked worktree, and `git worktree unlock` deletes the `locked` file whoever wrote it | direct experiment, git 2.56.0 | 2026-10-05 | High — direct observation |
| E-GIT-L5 | `lock_worktree` checks `worktree_lock_reason(wt)` and then calls `write_file(path, "%s", reason)`, which creates with truncate, not exclusively. A `git worktree lock` whose check runs before our create can overwrite our lease | https://raw.githubusercontent.com/git/git/v2.56.0/builtin/worktree.c (`lock_worktree`) | 2026-10-05 | High — source |
| E-GIT-L6 | `remove_worktree` reads the lock reason only when `force < 2` | same file (`remove_worktree`) | 2026-10-05 | High — source |

## Session processes (Linux/WSL, 2026-10-05)

Direct experiments ran each CLI headless in a temp repo and read `/proc`. Versions: Claude Code
2.1.290–2.1.291, codex-cli 0.159.3, cursor-agent 2026.09.28-64d2043, Copilot CLI 1.0.90–1.0.92.
Environment captures recorded variable names only.

| ID | Claim | Source | Date | Confidence |
|---|---|---|---|---|
| E-PROC-CC1 | The Claude Code session is one native process: exe `~/.local/share/claude/versions/<ver>`, argv0 `claude`; its own environment carries no `CLAUDECODE` | direct experiment, Claude Code 2.1.290/2.1.291 | 2026-10-05 | High — direct observation |
| E-PROC-CC2 | Tool subprocesses carry `CLAUDECODE`, `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_PID` (the launching session's pid), `CLAUDE_CODE_ENTRYPOINT`, `AI_AGENT`; an orphaned background child keeps them | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-CC3 | A nested `claude -p` run from a Claude Code tool shell inherits `CLAUDECODE`, `CLAUDE_CODE_CHILD_SESSION`, and the outer session's `CLAUDE_PID` and `CLAUDE_CODE_SESSION_ID`; environment alone cannot tell a nested session from a tool process | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-CC4 | Each live session writes `~/.claude/sessions/<pid>.json` with `pid`, `sessionId`, `cwd`, `procStart`, `kind`, `entrypoint`; a `-p` run removes it on exit | direct experiment | 2026-10-05 | High — direct observation, undocumented |
| E-PROC-CC5 | `claude -p --worktree <name>` starts with cwd at the launch directory, then changes its own process cwd to `<repo>/.claude/worktrees/<name>`; it creates branch `worktree-<name>` and locks the worktree with reason `claude session <name> (pid N start T)`, which outlives the process | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-CC6 | Claude Code keys transcripts by cwd: `~/.claude/projects/<cwd, non-alphanumerics → '-'>/`; each `legion-*` worktree has its own folder, while `memory/` exists only under the primary checkout's folder | direct observation of `~/.claude/projects` | 2026-10-05 | High for transcripts; Medium for memory |
| E-PROC-CX1 | The Codex session is native: exe `…/codex/<ver>/bin/codex`, argv0 `codex`, no marker in its own environment; helper child `codex-code-mode-host`; an `app-server-daemon` pid file can exist without a live daemon | direct experiment, codex-cli 0.159.3 | 2026-10-05 | High — direct observation |
| E-PROC-CX2 | Codex tool subprocesses carry `CODEX_SESSION_ID` (= `CODEX_THREAD_ID`), `CODEX_CI`, `CODEX_VERSION`; no pid variable. A plain `&` child died when the tool call returned; a `setsid` child survived with the session id | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-CX3 | Codex state is not keyed by path: `~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<id>.jsonl`, cwd recorded inside | direct observation of `~/.codex` | 2026-10-05 | High |
| E-PROC-CUR1 | The Cursor session process: exe `…/cursor-agent/versions/<ver>/node`, argv `~/.local/bin/cursor-agent --use-system-ca …/index.js`, own env `CURSOR_INVOKED_AS=cursor-agent` | direct experiment, cursor-agent 2026.09.28-64d2043 | 2026-10-05 | High — direct observation |
| E-PROC-CUR3 | Each session spawns a worker child with the same exe and argv, carrying `AGENT_CLI_SOCKET_PATH`, `AGENT_CLI_LOG_PATH`, `AGENT_CLI_WORKER_OPTIONS` and no `CURSOR_CONVERSATION_ID`; the worker outlived the session as an orphan | direct experiment, logged in | 2026-10-05 | High for the observation; Medium that the `AGENT_CLI_*` names reliably mark the worker |
| E-PROC-CUR4 | Cursor tool subprocesses carry `CURSOR_AGENT`, `CURSOR_CONVERSATION_ID` (session id), `CURSOR_REQUEST_ID`, `AGENT_TRANSCRIPTS`, `CURSOR_INVOKED_AS`; no pid variable. A plain `&` child was killed; a `setsid` child survived (reparented to `/init`) with the markers; a nested `cursor-agent -p` inherited them | direct experiment, logged in | 2026-10-05 | High — direct observation |
| E-PROC-CUR2 | Cursor keys state by path: `~/.cursor/projects/<slug>/`, slug cut to 60 characters plus a 7-character hash for long paths; holds `agent-transcripts/`, `terminals/`, `worker.log` | direct observation | 2026-10-05 | Medium — slug rule from three samples |
| E-PROC-COP1 | The Copilot CLI session is native: exe `…/copilot-cli/<ver>/copilot`, argv0 `copilot`; after an in-place auto-update `/proc/<pid>/exe` reads `… (deleted)` | direct experiment, Copilot CLI 1.0.90–1.0.92 | 2026-10-05 | High — direct observation |
| E-PROC-COP2 | Copilot tool shells (`/bin/bash --norc --noprofile -c`) carry `COPILOT_CLI`, `COPILOT_AGENT_SESSION_ID`; no pid variable. `copilot -p` waits for plain `&` children before exiting; a `setsid` child survives with the session id | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-COP3 | Copilot state is not keyed by path: `~/.copilot/session-state/<session-id>/`, cwd recorded in `workspace.yaml` | direct observation | 2026-10-05 | High |
| E-PROC-OS1 | On WSL an orphan is reparented to the distro's `/init` (pid 482 here), not pid 1 | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-OS2 | macOS: `proc_pidinfo(PROC_PIDVNODEPATHINFO)` returns another process's cwd, `proc_pidpath` its executable | https://opensource.apple.com/source/xnu/xnu-7195.81.3/libsyscall/wrappers/libproc/libproc.h.auto.html | 2026-10-05 | Medium — header, same-uid limit inferred |
| E-PROC-OS3 | Windows has no documented API for another process's cwd; it needs `NtQueryInformationProcess` plus reading the PEB, which Microsoft says may change | https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntqueryinformationprocess | 2026-10-05 | High — vendor doc |

## Session processes, more harnesses (Linux/WSL, 2026-10-05)

Same method as above. Versions: opencode 1.18.34, kilo/kilocode 7.8.3, gemini 0.62.0, qwen 0.24.7,
crush 0.97.1, goose 1.53.0, OpenHands CLI 1.16.0 (SDK 1.21.0, driven by a mock LLM), cline 3.0.68.
auggie 0.36.0 was not logged in and not run. Several installs are mise shims; the exe below is what
`/proc/<pid>/exe` resolved to.

| ID | Claim | Source | Date | Confidence |
|---|---|---|---|---|
| E-PROC-OC1 | opencode session: one native process `…/opencode` (argv via a `latest/` path; resolve with `/proc/<pid>/exe`); tool env `AGENT=1`, `OPENCODE=1`, `OPENCODE_PID=<session pid>`; no helper process; state in `~/.local/share/opencode/opencode.db` with the cwd in `project.worktree` and `session.directory` | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-KILO1 | `kilo` and `kilocode` are the same CLI. A session is a `node …/@kilocode/cli/bin/kilo` wrapper plus its native child `…/cli-linux-x64/bin/kilo`, alive together; tool env `AGENT`, `OPENCODE`, `KILO=1`, `KILO_PID=<native pid>`, `KILO_RUN_ID`, `KILO_PROCESS_ROLE=main`; state in `~/.local/share/kilo/kilo.db` keyed by cwd | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-QWEN1 | qwen session: one `node …/@qwen-code/qwen-code/cli-entry.js` process; tool env `QWEN_CODE=1`, `QWEN_CODE_SESSION_ID` (kept by orphans) and other `QWEN_CODE_*`; a tool shell sometimes reparented to `/init` while the session still ran; state in `~/.qwen/projects/<cwd, '/'→'-'>` | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-CRUSH1 | crush session: a `node …/@charmland/crush` wrapper plus native child `…/crush/bin/crush run`; tool env `CRUSH=1`, `AGENT=crush`, `AI_AGENT=crush`, no session-id or pid variable; state in `<cwd>/.crush/` inside the working tree, plus `~/.local/share/crush/projects.json` | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-GEM1 | gemini session: a `node …/@google/gemini-cli/bundle/gemini.js` wrapper plus a relaunched `node --max-old-space-size=… gemini.js` child (own env `GEMINI_CLI_NO_RELAUNCH`), alive together. Tool env unobserved (model returned HTTP 503); source sets `GEMINI_CLI=1` | direct experiment; source read | 2026-10-05 | High for the process pair; Low for tool env |
| E-PROC-GOOSE1 | goose session: one native `…/block-goose-cli/<ver>/bin/goose run|session` process, extensions in-process; tool env `AGENT_SESSION_ID` (= the `sessions.db` row id, kept by orphans), no pid variable; state keyed by session id in `~/.local/share/goose/sessions/sessions.db` with a `working_dir` column | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-OH1 | OpenHands CLI (local mode): session is `python3.12 ~/.local/bin/openhands …` (uv tool); tool commands run as `bash` under a separate `tmux -Lopenhands` server, not under the session; tool env has `TMUX`, `TMUX_PANE`, no session-id or pid variable; the tmux server exited with the session; state keyed by conversation id under `~/.openhands/conversations/` with `working_dir` recorded. Docker sandbox mode not observed | direct experiment with a mock LLM | 2026-10-05 | High for local mode |
| E-PROC-CLINE1 | cline session: a `node …/cline/bin/cline` wrapper plus native `…/cli-linux-x64/bin/cline "<prompt>"`. Tool commands run under a shared hub daemon (`cline --cline-hub-daemon --cwd <dir> …`, same exe as the session) that is reused across sessions and outlives them; tool env carries only static `CLINE_*` names plus whatever env the hub started with, no session-id or pid variable; session JSON under `~/.cline/data/sessions/<id>/` records `cwd` and the hub's pid | direct experiment | 2026-10-05 | High — direct observation |
| E-PROC-CLINE2 | A cline hub daemon observed on this machine had been started from a different Claude Code session and carried that session's `CLAUDE_CODE_SESSION_ID` | direct observation of `/proc/<pid>/environ` | 2026-10-05 | High — direct observation |
| E-PROC-CLINE3 | `cline --worktree` creates its own worktree under `~/.cline/worktrees/` | `cline --help` | 2026-10-05 | Low — help text only, not run |
| E-PROC-AUG1 | auggie 0.36.0 session: one `node …/@augmentcode/auggie/augment.mjs` process, no helper or worker seen, no marker in its own env; state keyed by uuid under `~/.augment/sessions/`. The account was out of usage, so no tool call ran and tool-process markers are unobserved | direct experiment | 2026-10-05 | High for the process; tool env unknown |
| E-PROC-AGY1 | Antigravity CLI `agy` 1.2.17 session: one native process `~/.local/bin/agy`, no child helper, no marker in its own env; tool shells are direct children carrying `ANTIGRAVITY_AGENT`, `ANTIGRAVITY_CONVERSATION_ID` (session id, kept by orphans), `ANTIGRAVITY_PROJECT_ID`, `ANTIGRAVITY_TRAJECTORY_ID` and other `ANTIGRAVITY_*`, no pid variable; it waits for plain `&` background tasks (up to 30 minutes); state in `~/.gemini/antigravity-cli/conversations/<uuid>.db`, keyed by conversation, with a project id from `~/.gemini/projects.json`; the `remote-control` daemon (systemd user unit `antigravity-cli-daemon.service`) was inactive | direct experiment | 2026-10-05 | High for the session; Low for the daemon's process shape |
| E-PROC-ENV1 | For opencode, kilo, qwen, crush, and goose the session-id and pid variables appear only on tool processes, not in the session process's own `/proc/<pid>/environ`, which holds its launch environment | direct experiment | 2026-10-05 | High — direct observation |
