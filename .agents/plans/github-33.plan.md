---
cr: github-33
title: Live environment captures for harnesses with no verified detection signal
branch: research/live-env-captures
todos:
  - id: openhands-cli
    content: Capture the OpenHands CLI shell and hook environment live, then correct the research and docs
    status: completed
  - id: pr-openhands
    content: Push research/live-env-captures and open a PR for the OpenHands CLI finding (Refs #33, not Closes)
    status: pending
  - id: unattributed-capture
    content: Attribute the user-pasted capture (harness, version, whether the agent ran it, WSL or Windows), then record it
    status: in_progress
  - id: antigravity
    content: Capture Antigravity (IDE and agy CLI); answer whether it sets GEMINI_CLI=1
    status: pending
  - id: rovo-dev
    content: Capture the Rovo Dev CLI
    status: pending
  - id: kiro
    content: Capture Kiro (IDE and CLI)
    status: pending
  - id: factory-droid
    content: Capture Factory Droid (shell tool, hooks, MCP servers)
    status: pending
  - id: devin-desktop
    content: Capture Devin Desktop
    status: pending
  - id: warp
    content: Capture Warp agent mode
    status: pending
  - id: augment-ide
    content: Capture the Augment IDE extension terminal
    status: pending
  - id: amp
    content: Capture Amp
    status: pending
---

# github-33: live environment captures

Issue: https://github.com/cyberuni/agent-harness/issues/33 (follows #6, waves 1 and 2).

## NEXT — resume here

**Next action.** Ask the user which harness produced the capture they pasted (harness and version,
whether the agent's own shell tool ran it or they typed it, and WSL or Windows). If the agent ran
it, add a "Direct experiment" row to `.research/harness-detection/evidence.md` in that harness's
section, and update `conclusion.md` "Wave 2: no verified signal" and `changes.md`. If it was typed
by hand, discard it: #33 needs the environment of a command the agent runs.

**Blocking decisions.**

- Open the PR now for the OpenHands finding, or wait for more captures on the same branch? Asked;
  no answer yet. Either way the PR says `Refs #33`, since most of #33 stays open.

**Findings the commits won't show.**

- The pasted capture held only shell, WSL, and the user's terminal-multiplexer variables. It had no
  `TERM_PROGRAM` or `VSCODE_*`, and `AI_AGENT` and `GEMINI_CLI` were empty. That does not look like
  a VS Code-fork integrated terminal, so it may not be an agent-run command. If it is Antigravity,
  it answers #33's question: Antigravity does not set `GEMINI_CLI=1`.
- A harness that accepts a custom OpenAI-compatible endpoint can be captured with no model account:
  point it at a local mock server that returns one `terminal` tool call, then `finish`. That is how
  the OpenHands CLI was captured (E-OH-D9). The other harnesses on #33 need vendor logins, so the
  user must run them.
- Unset `AI_AGENT` and the `CLAUDE*` variables before a nested capture, or the outer Claude Code
  session's values leak in (E-CODEX-D12).
- Of the harnesses on #33, only Antigravity is installed on this machine, and only on the Windows
  side.

**Done.** Commits 82e9c6b (research: E-OH-D9 to D11, E-OH-D7 refuted) and 3b562b9 (readme, docs
site, rule description, patch changeset). Detection code is unchanged, and tests pass.
