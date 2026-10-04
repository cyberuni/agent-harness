---
'@cyberuni/agent-harness': minor
---

Add `reference delete <name>`. It deletes the project (`.agents/references/`) or user (`~/.agents/references/`) copy of a reference, with `--scope` and `--dry-run`, and reports which copy answers the name afterwards. It refuses a plugin-shipped or managed copy.
