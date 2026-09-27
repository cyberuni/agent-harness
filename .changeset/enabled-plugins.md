---
'@cyberuni/agent-harness': minor
---

Add `enabledPlugins(harness, { env, homedir, cwd, platform })`. For Claude Code, Codex, and GitHub Copilot CLI it reads the settings files that record enabled plugins and resolves each plugin by scope precedence: managed, then local, then project, then user. It lists the files it read, and in `unread` it names the policy sources it cannot read, such as MDM and server-managed settings. Cursor reports `supported: false`, because Cursor keeps no record of enabled plugins.
