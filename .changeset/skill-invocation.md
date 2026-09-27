---
'@cyberuni/agent-harness': minor
---

Add `skillInvocation(harness, { plugin, skill })`, which returns what a user types to invoke a plugin skill: `/<plugin>:<skill>` in Claude Code, `/<skill>` in Cursor and GitHub Copilot CLI, and `$<skill>` in Codex. Add `supportsPluginDependencies(harness)`, which is `true` only for Claude Code.
