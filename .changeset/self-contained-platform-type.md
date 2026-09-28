---
'@cyberuni/agent-harness': patch
---

The published types no longer reference `NodeJS.Platform`, so a TypeScript project without `@types/node` in its `types` can import the package. The `platform` option now takes the exported `Platform` type, a union of the values `process.platform` reports.
