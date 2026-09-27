# Topic — Harness detection

## Why this topic exists

`@cyberuni/agent-harness` will tell a caller which agent harness it runs under and what that harness
holds. Issue [cyberuni/agent-harness#1](https://github.com/cyberuni/agent-harness/issues/1) asks
five research questions before any of it is coded:

- R1. How each harness can be detected at runtime.
- R2. Where each harness stores plugins, and whether the enabled set can be queried.
- R3. Where each harness keeps managed policy, and which policy is server-side only.
- R4. How each harness names a plugin skill.
- R5. Whether plugins can depend on other plugins.

The answer is in [conclusion.md](./conclusion.md). This file records how it was reached.

## Method

One investigation per harness, run in parallel on 2026-09-26, each against the vendor's own
documentation first. Where the documentation was silent, the investigation read the shipped CLI
(`--help`, a grep of the bundled JavaScript, or the open Rust source for Codex) and ran the CLI
headlessly to dump the environment of a shell command it spawned. Dumps recorded variable names
only.

universal-plugin's `vendors.json` and its `.research/` topics were used as leads and re-checked, not
copied.

All experiments ran on Linux under WSL, from inside a Claude Code session. That matters for R1: each
nested CLI's shell also carried Claude Code's variables, which is how the nesting problem surfaced
(E-CODEX-D12).

## Claude Code

The env-vars page documents `CLAUDECODE=1` for every subprocess Claude Code spawns, and says IDE
extensions set it in their integrated terminals too (E-CC-D1, E-CC-D2). So `CLAUDECODE` alone
cannot distinguish an agent's shell from a person typing in an editor that has the extension
installed. The same page documents `CLAUDE_CODE_CHILD_SESSION=1` as set only by Claude Code, for
tool subprocesses, hooks, and the status line, but not for stdio MCP servers (E-CC-D3). MCP servers
get `CLAUDE_CODE_SESSION_ID` instead (E-CC-D6). Requiring `CLAUDECODE` plus one of those two covers
every documented context and excludes the IDE terminal.

`CLAUDE_CODE_ENTRYPOINT` and `AI_AGENT` are present in practice but undocumented, so they are not
used (E-CC-D4, E-CC-D9).

Plugins are cached under `~/.claude/plugins/cache/` and listed in `installed_plugins.json`, but
installation is not enablement. Enablement is the `enabledPlugins` settings key, which any settings
scope can carry (E-CC-P1–P3). The settings page gives the scope order but no rule specific to this
object key (E-CC-P7). `claude plugin list --json` reports each install with its scope and enabled
state, which is the authoritative answer when shelling out is acceptable (E-CC-P6).

Managed policy has three local forms (files, the macOS managed-preferences domain, the Windows
registry) and one remote form (server-managed settings). By default the highest-ranked source that
carries any policy key wins outright (E-CC-M1, E-CC-M4, E-CC-M6). The Windows file path is
`C:\Program Files\ClaudeCode\`; the older `C:\ProgramData\` path is no longer read.

## Cursor

Cursor's terminal page documents `CURSOR_AGENT` as the way for a shell config to detect Cursor
(E-CUR-D1). The CLI bundle sets it to `1` for commands the agent runs, and a headless run confirmed
it (E-CUR-D2). The page does not say whether the IDE agent sets it as well, so the IDE's shipped
code was read next. It sets `CURSOR_AGENT:"1"` on the terminals its agent opens, alongside settings
that stop commands waiting for input, and in the extension host's base environment for agent shell
commands (E-CUR-D11). The IDE's MCP process does not set it (E-CUR-D12). The lead that
`CURSOR_TRACE_ID` marks the IDE terminal had no source at all (E-CUR-D5).

Hook commands get a separate, documented set: `CURSOR_PROJECT_DIR`, `CURSOR_VERSION`, and others,
plus a `CLAUDE_PROJECT_DIR` alias (E-CUR-D10). The alias is one reason `CLAUDE_*` names are not
evidence of Claude Code.

Plugin paths (`~/.cursor/plugins/local/`, `~/.cursor/plugins/marketplaces/`) come from the bundle.
No file records which plugins are enabled, and `cursor-agent plugin` manages marketplaces only
(E-CUR-P1–P8).

Cursor documents enterprise hook files per OS (E-CUR-M1). A `~/.cursor/managed/team_<id>/` folder
on the test machine looks like the Team-hook sync target, but no vendor page names it (E-CUR-M2).

## Codex

The public docs do not list the variables Codex sets on shell commands, so this part rests on the
source. `exec_env.rs` injects `CODEX_THREAD_ID` even when the shell env policy is an allowlist,
alongside `CODEX_SESSION_ID` and `CODEX_VERSION`, and unified exec adds `CODEX_CI=1` (E-CODEX-D1–D3,
E-CODEX-D7). `CODEX_SANDBOX` is macOS-only and `CODEX_PERMISSION_PROFILE` is documented in source as
spoofable, so neither is used (E-CODEX-D5, E-CODEX-D6).

The first pass reported `CODEX_COMPANION_SESSION_ID` and `CODEX_COMPANION_TRANSCRIPT_PATH` as Codex
variables. They were inherited from the Claude Code session that launched the experiment, where the
Codex plugin for Claude Code sets them.

Hooks are different: the hook engine sets only `PLUGIN_ROOT`, `PLUGIN_DATA`, and their `CLAUDE_*`
aliases (E-CODEX-D9, E-CODEX-D11). A Codex hook therefore cannot be identified by its environment.

Enabled plugins are `[plugins."<plugin>@<marketplace>"]` tables in `config.toml`, and installs are
copied to `plugins/cache/` (E-CODEX-P2, E-CODEX-P3). Managed policy paths and the macOS preference
domain are source constants (E-CODEX-M1–M6).

## GitHub Copilot CLI

The first pass found `COPILOT_CLI` and `COPILOT_AGENT_SESSION_ID` in a live dump and called them
undocumented. The Copilot CLI changelog documents both (E-COPILOT-D1, E-COPILOT-D2), and documents
`COPILOT_PLUGIN_ROOT` for plugin hooks alongside the `PLUGIN_ROOT` and `CLAUDE_PLUGIN_ROOT` aliases
(E-COPILOT-D6).

The first pass also concluded that Copilot CLI has no local managed-policy file. That was wrong.
GitHub documents file-based managed settings on all three OSes, MDM on macOS and Windows, and
server-managed settings in an enterprise repository, with MDM > server > file > user precedence
(E-COPILOT-M1–M3). The `~/.cache/copilot/managed-settings/` file is only a cache of the server
response.

`enabledPlugins` is a documented settings key in user, repository, and local settings, and managed
values win per plugin (E-COPILOT-P4, E-COPILOT-M4). Plugins install under
`~/.copilot/installed-plugins/` (E-COPILOT-P9). Skills are a flat namespace: the first skill found
with a given name wins, and project skills shadow plugin skills (E-COPILOT-S2, E-COPILOT-S5).

## Cross-harness findings

- **Compatibility aliases blur `CLAUDE_*` names.** Three harnesses pass `CLAUDE_PLUGIN_ROOT`,
  `CLAUDE_PLUGIN_DATA`, or `CLAUDE_PROJECT_DIR` to hooks or MCP servers. Only `CLAUDECODE` with a
  Claude Code session variable identifies Claude Code.
- **Nesting is ambiguous.** Environment variables are inherited, so a shell under Codex that was
  started from Claude Code carries both harnesses' markers. Nothing in the environment says which is
  innermost. The honest answer is `unknown`, with both candidates in the evidence.
- **Plugin dependencies are Claude Code only.** R5 is settled for all four.
