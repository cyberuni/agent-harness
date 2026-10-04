---
'@cyberuni/agent-harness': minor
---

Add reference documents: `loadReference()` and the functions behind it resolve a named Markdown document across the managed, project, user, and plugin tiers, merging each override as its frontmatter `merge` asks. The package also ships an `agent-harness reference` command, and `createReferenceCommand()` and `createReferenceCommands()` at `@cyberuni/agent-harness/commands` for hosting it in another clibuilder CLI. It now has runtime dependencies (`yaml`, `clibuilder`, `@toon-format/toon`), none of them an agent tool.
