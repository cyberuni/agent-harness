---
'@cyberuni/agent-harness': minor
---

Add reference documents: `loadReference()` and the functions behind it resolve a named Markdown document across the managed, project, user, and plugin tiers, merging each override as its frontmatter `merge` asks. The package also ships an `agent-harness reference` command, `createReferenceCommand()` at `@cyberuni/agent-harness/reference-command` for hosting it in another clibuilder CLI, and the encoders it writes with at `@cyberuni/agent-harness/command-output`. It now has runtime dependencies (`yaml`, `clibuilder`, `@toon-format/toon`), none of them an agent tool.
