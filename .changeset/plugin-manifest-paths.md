---
'@cyberuni/agent-harness': patch
---

The plugin manifests no longer point `skills` at a `./skills/` folder the package does not ship, and the package `files` list no longer names a `com.github.copilot` folder: Copilot CLI reads the root `plugin.json`.
