# @cyberuni/agent-harness

## 0.6.0

### Minor Changes

- f8913de: Add `acquire`, `release`, and `explain` to `@cyberuni/agent-harness/worktrees`. `acquire({ holder, branch?, base?, available?, max? })` leases an idle worktree of ours and recycles it (`read-tree --reset -u <base>`, then `clean -fd`, which keeps `node_modules`), or creates one at the next free `<parent>/<repo>.worktrees/<repo>-<n>` slot through an injectable creator. The lease is an exclusive-created git worktree lock, read back after the claim. `release(lease)` gives it back only when the lease id still matches and never recycles. `explain()` gives the skip reason for every worktree. A worktree with a live agent session is skipped; when the probe cannot read processes, reuse proceeds and is reported unverified unless `strict` is set. An unlocked worktree at a library slot now classifies as `self`.
- 3f2a9d4: Add the `@cyberuni/agent-harness/worktrees` subpath. It has three entry points:
  
  - `primaryRoot` finds the primary checkout from any folder in a repository, including a linked worktree.
  - `listWorktrees` lists every worktree with its branch, HEAD, detached, prunable and lock reason, plus whether its work has landed on the default branch and whether it is dirty.
  - `readDirty` checks a worktree for uncommitted changes, can ignore paths you name, and counts untracked files even when a repo hides them.
  
  Landed detection tries, in order: ancestry, a deleted upstream, a squash merge matched by patch id, and an opt-in forge probe (`ghForgeMergedProbe`).
- adc4d95: Add a process probe to `@cyberuni/agent-harness/worktrees` that finds live agent sessions inside a worktree. It never kills anything.
  
  - `probeProcesses` reads the process table once. Its `occupancy(root)` reports `busy`, the `occupants` (every live session, with no limit on how many), the `lingering` processes, and the `unlinked` ones. Lingering means no live session launched the process, so a caller can reclaim it. Unlinked means the probe cannot tell.
  - `occupants(root)` lists the sessions working in one worktree.
  - A session is recognised by its executable, so tool subprocesses such as a `vite` started from Claude Code are not sessions. 14 harnesses are covered: Claude Code, Codex, Copilot CLI, Cursor, opencode, Kilo, Qwen Code, Crush, Gemini CLI, Goose, OpenHands, Cline, Auggie, and the Antigravity CLI.
  - The process source can be swapped out. `procfsProcessSource` reads Linux `/proc`. On any other platform the probe is unverified and reports not busy, unless you pass `strict: true`.
- ffdc416: Add `classifyOwner` to `@cyberuni/agent-harness/worktrees`. It tells who owns a worktree: `self` (this library's lease), `claude-code`, `codex`, `user` (the primary checkout), or `unknown`. Each answer lists the research evidence it rests on. Only a `self` worktree may be reused or removed. `parseLeaseReason` reads the lease from a lock reason.
- 8bcef77: Add `pruneWorktrees` to `@cyberuni/agent-harness/worktrees`. It removes the worktrees this library owns that nothing needs any more (unleased, idle, clean, and landed), then runs `git worktree prune`. It is a dry run unless `apply` is set, and returns an outcome per worktree with a skip reason. It never touches the primary checkout, a foreign or locked worktree, a leased one, or one with a live agent session; when the process probe cannot read the platform it skips unless `strict: false`. It never kills a process: lingering dev services are reported so the caller can reclaim them.
- 654ac52: Add `seedWorktree` to `@cyberuni/agent-harness/worktrees`. It copies the gitignored files a `.worktreeinclude` names from the primary checkout into a new or recycled worktree, following Claude Code's semantics, and returns an inventory of what it copied and what it skipped and why. It reads the include file as data and runs no command but git; file operations go through an injectable `SeedFs`.

### Patch Changes

- 5d67d18: `agent-harness reference` now writes its `--format` output through `@clibuilder/axi` instead of a local copy of the same contract, and no longer depends on `@toon-format/toon` directly. TOON, JSON, and text output are byte-identical: axi's text renderer is the one this package carried. An unknown `--format` value is now rejected by clibuilder before the command runs, as a usage error (exit code 2) with clibuilder's message and the command's help, where it used to exit 1 with `error: --format must be toon, json, or text.`

## 0.5.0

### Minor Changes

- dae27d3: Rename the agent plugin from `agent-harness` to `cyber-agent-harness`, so its skills no longer share a namespace with any other marketplace's plugin of that generic name. Claude Code's typed form is now `/cyber-agent-harness:reference`; uninstall `agent-harness` and run `/plugin install cyber-agent-harness@cyberplace`. The `reference` command's own plugin layer is now named `cyber-agent-harness`, read from `plugin.json`, so `cyber-agent-harness/<name>` selects it. The npm package, the `agent-harness` command, and the library API are unchanged.

## 0.4.0

### Minor Changes

- 9ca2ca0: Add `headlessInvocation()` and `headlessCommand()`: how to run Claude Code, Codex, Copilot CLI, Cursor, Gemini CLI, or Qwen Code on one prompt with no user present — the command, model and permission flags, output formats and where token usage and cost appear, the transcript location, and the documented exit codes. Copilot in VS Code reports no headless mode, and the harnesses whose one-shot flags are not yet verified report `unknown`.
- 7151efb: `skillInvocation('kilo', …)` now returns `/<skill>` (not namespaced by plugin) instead of `undefined`: Kilo Code's CLI and VS Code extension both register every loaded skill as a slash command.
- 9002ef2: Add `reference delete <name>`. It deletes the project (`.agents/references/`) or user (`~/.agents/references/`) copy of a reference, with `--scope` and `--dry-run`, and reports which copy answers the name afterwards. It refuses a plugin-shipped or managed copy.
- 849cff0: Add reference documents: `loadReference()` and the functions behind it resolve a named Markdown document across the managed, project, user, and plugin tiers, merging each override as its frontmatter `merge` asks. The package also ships an `agent-harness reference` command, and `createReferenceCommand()` and `createReferenceCommands()` at `@cyberuni/agent-harness/commands` for hosting it in another clibuilder CLI. It now has runtime dependencies (`yaml`, `clibuilder`, `@toon-format/toon`), none of them an agent tool.
- f634c3c: Ship the `reference` skill in the `agent-harness` plugin, moved from `buddy-agent-harness`. Type `/reference` (`/agent-harness:reference` in Claude Code) to load, create, update, delete, find, or inspect a reference, or to wire a skill to load one. It runs this package's `reference` command from a bundled `scripts/reference.mjs` that needs no `node_modules`, and falls back to `npx -y @cyberuni/agent-harness` outside Load.
- 5a3e631: `skillsDirectories()` now returns Kilo Code's directories (`.kilo/skills`, `.agents/skills`, `.claude/skills`) instead of `undefined`, adds `.claude/skills` and `.agents/skills` for the Auggie CLI, and adds `.agents/skills` for Cline, at both project and user scope.

### Patch Changes

- 2823c69: Document that the OpenHands CLI 1.16.0 marks only its hook commands. Its shell commands carry no `AI_AGENT=openhands`, because it bundles an OpenHands SDK older than that variable. Detection is unchanged.

## 0.3.0

### Minor Changes

- b60b4e7: Add `installedPlugins(harness)`: each installed plugin with the folder the harness loads it from, its version, and, for Claude Code, its install scope. It reads Claude Code's `installed_plugins.json`, Copilot CLI's `config.json`, and Codex's plugin cache, where it applies Codex's own active-version rule. Every other harness reports `supported: false`.

## 0.2.0

### Minor Changes

- 0f40b36: Add `skillsDirectories(harness)`: the project and user directories a harness reads skills from, with the evidence IDs behind them. It returns `undefined` for Kilo Code, Qwen Code, Crush, and OpenHands, where the directories are not confirmed.
- 2c66fbf: `detectHarness()` now also detects Crush (`CRUSH=1`), OpenHands (`AI_AGENT=openhands`, or its hook variables), and the Auggie CLI (in hook commands only), and `pluginStorage()`, `managedPolicyLocations()`, `enabledPlugins()`, `skillInvocation()`, and `supportsPluginDependencies()` answer for them. `AI_AGENT` counts as evidence only with the exact value `openhands`; other values, and `AGENT=crush`, are still ignored. Goose, Antigravity, Rovo Dev, Kiro, Amp, Factory Droid, Devin Desktop, and Warp are not detected, because none has a verified signal.

## 0.1.0

### Minor Changes

- f3a9e78: `detectHarness()` now detects Claude Code, Cursor, Codex, and GitHub Copilot CLI from the process environment. It reports the matched `harness`, every signal it found as `evidence` (each with the research claim ID behind it), and the `candidates` it matched. It reports `unknown` when no harness matches and when more than one does, as happens when one harness runs inside another.
- f44d752: Add `enabledPlugins(harness, { env, homedir, cwd, platform })`. For Claude Code, Codex, and GitHub Copilot CLI it reads the settings files that record enabled plugins and resolves each plugin by scope precedence: managed, then local, then project, then user. It lists the files it read, and in `unread` it names the policy sources it cannot read, such as MDM and server-managed settings. Cursor reports `supported: false`, because Cursor keeps no record of enabled plugins.
- 5823a1b: Add `managedPolicyLocations(harness, { platform })`. It lists where each harness keeps managed policy: local files and directories, macOS managed-preferences domains, Windows registry keys, and server-side sources that cannot be read locally. Each entry names the research claim behind it.
- a78c46a: `detectHarness()` now also detects OpenCode, Kilo Code, Gemini CLI, Qwen Code, GitHub Copilot in VS Code, and Cline, and `pluginStorage()`, `managedPolicyLocations()`, `enabledPlugins()`, `skillInvocation()`, and `supportsPluginDependencies()` answer for them. Kilo Code still sets OpenCode's `OPENCODE=1`, but it is detected as `kilo`; `AGENT` and `AI_AGENT`, which several vendors share, are not treated as evidence.
  
  `skillInvocation()` now returns `undefined` for a harness with no typed skill invocation: OpenCode, Kilo Code, Gemini CLI, and Qwen Code load skills through a model tool call.
- 68fce08: Add `pluginStorage(harness, { env, homedir })`. It returns a harness's user-level config directory, after `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, or `COPILOT_HOME`, and where it keeps installed plugins, marketplaces, the install record, and the enabled record.
- e6165bf: Add `skillInvocation(harness, { plugin, skill })`, which returns what a user types to invoke a plugin skill: `/<plugin>:<skill>` in Claude Code, `/<skill>` in Cursor and GitHub Copilot CLI, and `$<skill>` in Codex. Add `supportsPluginDependencies(harness)`, which is `true` only for Claude Code.

### Patch Changes

- b0de9bb: The plugin manifests no longer point `skills` at a `./skills/` folder the package does not ship, and the package `files` list no longer names a `com.github.copilot` folder: Copilot CLI reads the root `plugin.json`.
- 9d4b8d2: A release now carries the package version into `plugin.json` and the per-harness plugin manifests, so they no longer stay at `0.0.0`.
- 120b0b3: The published types no longer reference `NodeJS.Platform`, so a TypeScript project without `@types/node` in its `types` can import the package. The `platform` option now takes the exported `Platform` type, a union of the values `process.platform` reports.
