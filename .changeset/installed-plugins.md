---
'@cyberuni/agent-harness': minor
---

Add `installedPlugins(harness)`: each installed plugin with the folder the harness loads it from, its version, and, for Claude Code, its install scope. It reads Claude Code's `installed_plugins.json`, Copilot CLI's `config.json`, and Codex's plugin cache, where it applies Codex's own active-version rule. Every other harness reports `supported: false`.
