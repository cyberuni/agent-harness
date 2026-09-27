# AGENTS.md — @cyberuni/agent-harness

Zero runtime dependencies. Do not add one without moving this rule.

## Screaming Architecture

Folders under `src/` are named after **domain concepts**, not technical roles. Add a new top-level
folder only when a new domain concept warrants it. Do not create generic folders like `src/utils/`
or `src/helpers/`.

## Facts about harnesses cite research

Any claim in this package's source or comments about what a harness does — a manifest path, a
policy file location, a naming convention — must trace back to `.research/harness-detection` (or a
later research topic that supersedes it). Do not encode a guess as a fact. Each encoded fact names
the evidence ID it rests on (for example `research: 'E-CC-D1'`), so a reviewer can check it against
`evidence.md`. When a signal is ambiguous, report `unknown` rather than guess.
