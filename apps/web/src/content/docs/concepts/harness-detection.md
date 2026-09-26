---
title: Harness detection
description: How agent-harness will identify which AI agent harness is running, once the research behind it lands.
---

This page is a stub. `@cyberuni/agent-harness` does not yet detect anything: `detectHarness()`
always returns `{ harness: 'unknown', evidence: [] }`.

The detection rules — which environment variables, files, or process trees identify Claude Code,
Cursor, Codex, or GitHub Copilot CLI, and where each one keeps its managed-policy locations, plugin
storage, enabled plugins, and skill naming — are being investigated under
[`.research/harness-detection`](https://github.com/cyberuni/agent-harness/tree/main/.research). This
page will be rewritten once that research has a conclusion.
