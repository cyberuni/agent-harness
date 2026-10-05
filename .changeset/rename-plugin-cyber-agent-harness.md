---
"@cyberuni/agent-harness": minor
---

Rename the agent plugin from `agent-harness` to `cyber-agent-harness`, so its skills no longer share a namespace with any other marketplace's plugin of that generic name. Claude Code's typed form is now `/cyber-agent-harness:reference`; uninstall `agent-harness` and run `/plugin install cyber-agent-harness@cyberplace`. The `reference` command's own plugin layer is now named `cyber-agent-harness`, read from `plugin.json`, so `cyber-agent-harness/<name>` selects it. The npm package, the `agent-harness` command, and the library API are unchanged.
