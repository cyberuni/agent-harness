---
'@cyberuni/agent-harness': minor
---

`detectHarness()` now also detects OpenCode, Kilo Code, Gemini CLI, Qwen Code, GitHub Copilot in VS Code, and Cline, and `pluginStorage()`, `managedPolicyLocations()`, `enabledPlugins()`, `skillInvocation()`, and `supportsPluginDependencies()` answer for them. Kilo Code still sets OpenCode's `OPENCODE=1`, but it is detected as `kilo`; `AGENT` and `AI_AGENT`, which several vendors share, are not treated as evidence.

`skillInvocation()` now returns `undefined` for a harness with no typed skill invocation: OpenCode, Kilo Code, Gemini CLI, and Qwen Code load skills through a model tool call.
