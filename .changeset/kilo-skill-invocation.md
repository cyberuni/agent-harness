---
'@cyberuni/agent-harness': minor
---

`skillInvocation('kilo', …)` now returns `/<skill>` (not namespaced by plugin) instead of `undefined`: Kilo Code's CLI and VS Code extension both register every loaded skill as a slash command.
