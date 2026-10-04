---
'@cyberuni/agent-harness': minor
---

Ship the `reference` skill in the `agent-harness` plugin, moved from `buddy-agent-harness`. Type `/reference` (`/agent-harness:reference` in Claude Code) to load, create, update, delete, find, or inspect a reference, or to wire a skill to load one. It runs this package's `reference` command from a bundled `scripts/reference.mjs` that needs no `node_modules`, and falls back to `npx -y @cyberuni/agent-harness` outside Load.
