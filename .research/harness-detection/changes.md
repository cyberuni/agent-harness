# Changes

## 2026-09-26 — created

Opened for [cyberuni/agent-harness#1](https://github.com/cyberuni/agent-harness/issues/1), covering
R1–R5 for Claude Code, Cursor, Codex, and GitHub Copilot CLI.

Corrections made before the topic was first committed, after checking the first pass against
vendor sources:

- Copilot CLI managed policy. The first pass said no local file exists. GitHub documents
  `managed-settings.json` paths for Linux, macOS, and Windows, plus MDM and server-managed delivery.
  E-COPILOT-M1 to M4 were rewritten.
- Copilot CLI detection variables. `COPILOT_CLI=1`, `COPILOT_AGENT_SESSION_ID`, and
  `COPILOT_PLUGIN_ROOT` were raised from observed-but-undocumented to High on the strength of the
  vendor changelog.
- Cursor detection. `CURSOR_AGENT` was raised to High on the strength of Cursor's terminal page.
- Codex detection. `CODEX_COMPANION_*` were reattributed to the parent Claude Code session.
  `CODEX_CI=1` was confirmed in source.
- Removed account-identifying values (a team id and team name) from E-CUR-M2.

## 2026-09-26 — Copilot CLI slash form sourced

Added E-COPILOT-S6, GitHub's own statement that a skill is invoked by its name after a forward
slash, so the `/<skill>` form in R4 no longer rests on the `skill list` output alone.

## 2026-09-26 — Cursor IDE agent

Read the Cursor IDE's shipped code (3.18.9) to settle whether its agent sets `CURSOR_AGENT=1`. It
does, on agent terminals and agent shell commands (E-CUR-D11). The IDE's MCP servers do not get it,
and only the CLI exports `CURSOR_INVOKED_AS` (E-CUR-D12). Detection needs no change: both report
`cursor`. The open question is narrowed to confirming this in a live IDE session.

## 2026-09-26 — wave 1 of #6

Added OpenCode, Kilo Code, Gemini CLI, Qwen Code, GitHub Copilot in VS Code, and Cline to R1–R5
(E-OC, E-KILO, E-GEM, E-QWEN, E-VSC, E-CLINE), and checked the survey's reported retirements
(E-RET). Every wave-1 harness has a verified detection signal. Corrections to the #6 leads:

- Qwen Code does not set `GEMINI_CLI`, and its `QWEN_CODE` value is `1`, not empty.
- Kilo Code's own marker is `KILO=1`; `KILO_PID` replaces `OPENCODE_PID` rather than joining it.
- The VS Code release note's `VSCODE_AGENT` does not exist; the variable is `COPILOT_AGENT`.
- Aider is stalled, not discontinued.

Corrected before commit: the first pass missed the `GEMINI_CLI_HOME` and `QWEN_HOME` overrides and
the XDG config path of OpenCode and Kilo Code (E-GEM-P2, E-QWEN-P4, E-OC-P4, E-KILO-P4).

## 2026-09-27 — wave 2 of #6

Added Crush, Goose, OpenHands, the Auggie CLI, Antigravity, and Rovo Dev to the evidence (E-CRUSH,
E-GOOSE, E-OH, E-AUG, E-AGY, E-ROVO), and re-checked detection for Kiro, Amp, Factory Droid, Devin
Desktop, and Warp (E-KIRO, E-AMP, E-DROID, E-DEVIN, E-WARP). Crush, OpenHands, and the Auggie CLI
(hooks only) have verified signals. The other eight are recorded under "Wave 2: no verified signal"
in the conclusion. Corrections to the #6 leads:

- Goose's documented `GOOSE_TERMINAL=1` is set only on recipe check commands, not on the shell tool.
- OpenHands has no `OPENHANDS=1`; it marks shell commands with `AI_AGENT=openhands`.
- Crush sets `CRUSH=1` beside the shared `AGENT` and `AI_AGENT`.
- Goose moved to `aaif-goose/goose`; OpenHands' runtime moved to `OpenHands/software-agent-sdk`.

Corrected before commit: the hook-executor line anchor in E-OH-D4, and Factory Droid's npm package,
which is `droid`, not `factory-cli`.

## 2026-09-28 — skill directories (R6)

Added where each harness reads skills (E-CC-L1, E-CUR-L1, E-CODEX-L1, E-GEM-L1, E-KILO-L1), for
repobuddy/buddy-agent-harness#161, which moves its skills-path facts and its drift checks here.
E-GEM-L1 supersedes E-GEM-S1 on the directories: Gemini CLI also reads the `.agents/skills` alias
at both scopes, and the alias wins a name clash. E-KILO-L1 carries over buddy-agent-harness's
E-KILO-01: the documented `.agents/skills` is disputed, so Kilo Code's directories stay unconfirmed.
Re-checked Cline's docs: they still name no `.agents/skills` path, although `vercel-labs/skills`
lists Cline as universal.

## 2026-09-28 — installed plugin folders (R7)

Added R7 for [#38](https://github.com/cyberuni/agent-harness/issues/38). Read Codex's active-version
rule from source at rust-v0.153.4 (E-CODEX-P8). Installed a marketplace plugin, a direct plugin, and
a local-marketplace plugin into scratch `COPILOT_HOME` folders with Copilot CLI 1.0.88 and recorded
the `config.json` install record (E-COPILOT-P10–P12). E-COPILOT-P13 qualifies E-COPILOT-P2: the XDG
split read from the bundle did not move a plugin install out of `~/.copilot`.
