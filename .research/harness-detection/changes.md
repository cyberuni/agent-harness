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
