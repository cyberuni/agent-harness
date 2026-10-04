---
title: Reference documents
description: How agent-harness resolves a named reference document across the managed, project, user, and plugin tiers, and how an override merges with the layers below.
---

A reference is a named Markdown document an agent reads on demand, such as a checklist or a set of
weights a skill applies. A plugin ships the default. A project or a person can override it without
editing the plugin.

```ts
import { loadReference } from '@cyberuni/agent-harness'

const resolved = await loadReference('agent-readiness-weights', {
	root: process.cwd(),
	plugin: { name: 'my-plugin', root: pluginRoot },
})
if (resolved.status === 'found') console.log(resolved.content)
```

From a shell, or from an agent:

```sh
npx -y @cyberuni/agent-harness reference show agent-readiness-weights
```

## Where a reference is read from

Layers are read highest precedence first.

| Tier | Folders |
| --- | --- |
| managed | The admin `references/` folder (`/etc/buddy-agent-harness/references` on Linux), and a `references/` beside each detected harness's managed-policy files |
| project | `.agents/references/` in the root and each folder above it, up to the repository root |
| user | `~/.agents/references/` |
| plugin | The calling plugin's `references/`, each plugin the harness has enabled, then each package the project's `package.json` declares |

Within a folder, `<name>.md` answers first, then `<name>/README.md`, `<name>/index.md`, and
`<name>/SKILL.md`.

Plugins are alternatives, not a stack. When two plugins hold the same name and resolution reaches
the plugin tier, the result is `ambiguous`; ask for `<plugin>/<name>` instead.

A plugin layer is read only for a plugin the harness has enabled, or a package the project
declares. Installing a plugin never adds a layer, because a reference is instruction text an agent
follows.

## How layers combine

The frontmatter `merge` key says how a document combines with the layers below it.

| `merge` | Effect |
| --- | --- |
| `first-wins` (default) | Replaces every layer below |
| `combine` | Placed above the layers below, each kept whole |
| `merge-sections` | Replaces the sections it redefines, matched by heading path, and keeps the rest |

Under a heading in a `merge-sections` document, a comment changes how that one section applies:

```md
## Weights
<!-- merge: combine -->

- Tests: 30
```

`<!-- merge: combine -->` appends to the section below, and `<!-- merge: remove -->` deletes it.
Give each topic its own `##` section: a single `#` title would hold every section under it.

## Frontmatter

Frontmatter is read as YAML. The resolver reads `merge`, `description` (shown by `list` and
`search`), and `tags` (matched by `search`). `resolved.metadata` holds every key, the higher layer
winning. Frontmatter that is not a YAML mapping is ignored with a warning.
