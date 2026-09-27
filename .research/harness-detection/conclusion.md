# Conclusion — Harness detection (September 2026)

## Last updated

2026-09-26. Versions checked: Claude Code 2.1.283, cursor-agent 2026.07.01-41b2de7, codex-cli
0.153.4 (source at openai/codex b8d5e3f), GitHub Copilot CLI 1.0.83.

## Question

How can a process tell which agent harness it runs under — Claude Code, Cursor, Codex, or GitHub
Copilot CLI — and, for that harness, where do its plugins live, which plugins are enabled, where
does managed policy live, how does it name plugin skills, and can plugins depend on each other?

## Verdict

**Every harness marks the shell commands its agent runs with an environment variable, and three of
the four document it.** Detection by environment is reliable for commands the agent runs. It is
weaker for hook scripts and MCP servers, and it cannot resolve nesting: a harness started from
another harness's shell inherits the outer harness's variables, so the environment alone cannot say
which one is innermost. A detector must report `unknown` when signals from two harnesses are
present.

## R1. Detection signals

| Harness | Accept as detection | Contexts | Confidence | Evidence |
| --- | --- | --- | --- | --- |
| Claude Code | `CLAUDECODE=1` **and** either `CLAUDE_CODE_CHILD_SESSION=1` or `CLAUDE_CODE_SESSION_ID` set | Bash/PowerShell/Monitor tools, hooks, status line (child session); stdio MCP servers (session id) | High | E-CC-D1, E-CC-D3, E-CC-D6 |
| Cursor | `CURSOR_AGENT=1` | Terminal commands the agent runs | High for the variable; the vendor page does not split IDE from CLI, and only the CLI was observed | E-CUR-D1, E-CUR-D2 |
| Cursor (hooks) | `CURSOR_VERSION` and `CURSOR_PROJECT_DIR` both set | Hook commands | High | E-CUR-D10 |
| Codex | `CODEX_THREAD_ID` set | Shell tool commands; injected even under a restrictive shell env policy | High (source read, undocumented on the docs site) | E-CODEX-D2 |
| Copilot CLI | `COPILOT_CLI=1`, or `COPILOT_AGENT_SESSION_ID` set | Shell commands (and git hooks they trigger); MCP servers | High (vendor changelog) | E-COPILOT-D1, E-COPILOT-D2 |
| Copilot CLI (hooks) | `COPILOT_PLUGIN_ROOT` set | Plugin hook commands | High (vendor changelog) | E-COPILOT-D6 |

Signals to **reject** as proof:

- `CLAUDECODE=1` alone. IDE extensions set it in their integrated terminals too (E-CC-D2).
- `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PROJECT_DIR`, `PLUGIN_ROOT`, `PLUGIN_DATA`.
  Codex, Copilot CLI, and Cursor hand these to hooks or MCP servers as compatibility aliases
  (E-CODEX-D9, E-COPILOT-D6, E-CUR-D10).
- `TERM_PROGRAM=vscode`. Any VS Code fork sets it. `CURSOR_TRACE_ID` has no source (E-CUR-D5).
- `CODEX_SANDBOX` (macOS only), `CODEX_PERMISSION_PROFILE` (spoofable, per the source comment),
  `CODEX_COMPANION_*` (set by the Codex plugin for Claude Code, not by Codex) (E-CODEX-D5,
  E-CODEX-D6, E-CODEX-D7).
- `COPILOT_HOME`, `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, `CURSOR_CONFIG_DIR`. These are user settings.

**Not detectable by environment:** Codex hook commands, which receive only the plugin-root
variables (E-CODEX-D11).

## R2. Plugin storage and enabled plugins

| Harness | Config root | Installed plugins | Enabled record | Query |
| --- | --- | --- | --- | --- |
| Claude Code | `$CLAUDE_CONFIG_DIR` or `~/.claude` (E-CC-D7) | `plugins/cache/<marketplace>/<plugin>/<version>/`, listed in `plugins/installed_plugins.json` (E-CC-P1, E-CC-P2) | `enabledPlugins` (`plugin@marketplace` → boolean) in managed, local, project, and user settings (E-CC-P3) | Read the settings files, or `claude plugin list --json` (E-CC-P6) |
| Cursor | `~/.cursor` (`CURSOR_CONFIG_DIR` override read from the bundle only) | `plugins/local/<dir>/`, `plugins/marketplaces/` (E-CUR-P1–P3) | Not found (E-CUR-P8) | None. No CLI command lists installed plugins (E-CUR-P7) |
| Codex | `$CODEX_HOME` or `~/.codex` (E-CODEX-D8) | `plugins/cache/<marketplace>/<plugin>/<version>/` (E-CODEX-P3) | `[plugins."<plugin>@<marketplace>"] enabled = <bool>` in `config.toml` (E-CODEX-P2) | Read `config.toml` |
| Copilot CLI | `$COPILOT_HOME` or `~/.copilot` (E-COPILOT-P1) | `installed-plugins/<marketplace>/<plugin>/`, `installed-plugins/_direct/<id>/` (E-COPILOT-P9) | `enabledPlugins` in user, repository (`.github/copilot/settings.json`), and local (`.github/copilot/settings.local.json`) settings; managed entries win per plugin (E-COPILOT-P4, E-COPILOT-M4) | Read the settings files, or `copilot plugin list --json` (E-COPILOT-P5) |

Caveats:

- Claude Code documents the settings precedence (managed > local > project > user) but not how the
  `enabledPlugins` object merges across scopes. Resolving each plugin key by that precedence is the
  reading this project takes; it is Medium confidence (E-CC-P7). A plugin with no entry falls back to
  its `defaultEnabled` value, which lives in the plugin, not in settings (E-CC-P3).
- Copilot CLI also reads `enabledPlugins` from `.claude/settings.json` and
  `.claude/settings.local.json`, but the docs do not rank them against `.github/copilot/`
  (E-COPILOT-P4). Its settings files are JSON with comments.
- Server-managed and MDM policy cannot be read from a file (see R3), so any locally resolved enabled
  set can be overridden by policy this package cannot see.

## R3. Managed policy

| Harness | Local file | MDM / registry | Server-side only |
| --- | --- | --- | --- |
| Claude Code | `managed-settings.json`, `managed-settings.d/*.json`, `managed-mcp.json` in `/Library/Application Support/ClaudeCode/` (macOS), `/etc/claude-code/` (Linux, WSL), `C:\Program Files\ClaudeCode\` (Windows) (E-CC-M1) | macOS `com.anthropic.claudecode`; Windows `HKLM\SOFTWARE\Policies\ClaudeCode` (and user-writable `HKCU`) (E-CC-M6) | Server-managed settings from the claude.ai admin console (E-CC-M4) |
| Cursor | Enterprise hooks: `/etc/cursor/hooks.json` (Linux), `/Library/Application Support/Cursor/hooks.json` (macOS), `C:\ProgramData\Cursor\hooks.json` (Windows) (E-CUR-M1) | Not documented beyond these files | Team hooks and admin settings from the Cursor dashboard (E-CUR-M1) |
| Codex | `/etc/codex/requirements.toml`, `/etc/codex/managed_config.toml`, `/etc/codex/config.toml` (Unix); `%ProgramData%\OpenAI\Codex\requirements.toml` (Windows) (E-CODEX-M1–M5) | macOS `com.openai.codex`, keys `config_toml_base64`, `requirements_toml_base64` (E-CODEX-M6) | Cloud-managed requirements (E-CODEX-M8) |
| Copilot CLI | `managed-settings.json` in `/etc/github-copilot/` (Linux), `/Library/Application Support/GitHubCopilot/` (macOS), `%ProgramFiles%\GitHubCopilot\` (Windows) (E-COPILOT-M1) | macOS `com.github.copilot`; Windows `HKLM\SOFTWARE\Policies\GitHubCopilot` (E-COPILOT-M2) | Server-managed settings in the enterprise's `.github-private` repository (E-COPILOT-M3) |

The Cursor row covers hooks only. Cursor documents no local file for its other enterprise
settings.

## R4. Skill naming

| Harness | Slash command | Prose mention | Namespaced by plugin? | Evidence |
| --- | --- | --- | --- | --- |
| Claude Code | `/<plugin>:<skill>`; bare `/<skill>` also works when no other command has the name | — | Yes | E-CC-S1 |
| Cursor | `/<skill>` | — | No | E-CUR-S1 |
| Codex | `/skills` opens a picker | `$<skill>` | No; skills are bare names (Medium) | E-CODEX-S1–S3 |
| Copilot CLI | `/<skill>` | — | No; first skill found with the name wins | E-COPILOT-S2, E-COPILOT-S5, E-COPILOT-S6 |

The skill's frontmatter `name` supplies the skill segment in every harness.

## R5. Plugin-to-plugin dependencies

Only Claude Code supports them: `dependencies` in `plugin.json` (E-CC-X1). Cursor's schema
(E-CUR-X1), Codex's manifests and the Agent Plugins 1.0 schema (E-CODEX-X1, E-CODEX-X2), and
Copilot CLI's manifest reference (E-COPILOT-X1) have no such field.

## Open questions

- Whether the Cursor **IDE** agent sets `CURSOR_AGENT=1` as the CLI does. The vendor page implies it
  but was not observed.
- How Claude Code merges `enabledPlugins` across scopes, and how Copilot CLI ranks `.claude/`
  settings against `.github/copilot/` settings.
- Whether Cursor persists a per-plugin enabled state anywhere.
- Whether two Codex plugins with the same skill name are disambiguated.
