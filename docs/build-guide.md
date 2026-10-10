# Vault Dweller build guide

This is a step-by-step guide for building Vault Dweller by hand. It stands alone: a coding session in this repo needs no access to the vault. `docs/PRD.md` holds the requirements, acceptance criteria, config shape, tool list, and health checks that this guide refers to.

## Verified facts about Pi

These were checked against the installed `@earendil-works/pi-coding-agent` 1.1.0 on 2026-10-09. Re-check them if the Pi version changes.

- **Package manifest.** Declare resources under `package.json` `"pi": { "extensions": [...], "skills": [...], "prompts": [...] }`. Add the `"pi-package"` keyword.
- **Dependencies.** Host packages (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`, `typebox`) go in `peerDependencies` with a `"*"` range, never in `dependencies`. Runtime libraries such as `yaml` go in `dependencies`. Pi installs them for git and npm sources, but not for local paths.
- **Install.**
  - `pi install git:github.com/<owner>/<repo> -l` installs it into the current project's `.pi/settings.json`. Pi loads it only after project trust is granted.
  - Without `-l`, the install is global, in Pi's global settings file.
  - `@v0.1.0` pins a tag.
  - `pi -e <source>` loads it for one session without installing.
  - `pi install <local path>` loads the folder in place, and `/reload` picks up edits.
- **Docs.** Read these in the installed package:
  - `docs/extensions.md`, `docs/packages.md`, `docs/skills.md`, `docs/prompt-templates.md`, `docs/sdk.md`
  - `dist/core/extensions/types.d.ts`, the source of truth for types
  - examples: `examples/extensions/todo.ts`, `plan-mode/`, `dynamic-tools.ts`, `prompt-customizer.ts`, `claude-rules.ts`, `protected-paths.ts`, `dynamic-resources/`
- **Tools.** Register with `pi.registerTool({ name, label, description, parameters, promptSnippet, promptGuidelines, executionMode, execute })`.
  - Parameters use TypeBox (`import { Type } from "typebox"`). For string enums, use `StringEnum` from `@earendil-works/pi-ai`, not `Type.Union` of literals.
  - `execute(toolCallId, params, signal, onUpdate, ctx)` returns `{ content: [{ type: "text", text }], details, isError? }`. `details` is required; use `undefined` if there's nothing to return.
- **Commands.** `pi.registerCommand(name, { description, getArgumentCompletions, handler(args, ctx) })`. Guard UI calls with `ctx.hasUI`; there's no UI in print or json mode.
- **System prompt.** `pi.on("before_agent_start", (event) => { event.systemPromptOptions.sections.vault_context = "..." })` adds a section.
- **Writing files.** Write through `withFileMutationQueue(path, fn)`, exported from the package root. It deadlocks if you nest it on the same path, so do one read-modify-write per file per call.
- **Skills.** Each skill is a directory containing `SKILL.md`. The frontmatter `name` is lowercase with hyphens, up to 64 characters, and matches the folder. On a name collision, the first discovered skill wins. Project `.agents/skills` (searched up to the git root) load before package skills.
- **Auto-discovery.** Pi auto-discovers `<project>/.pi/extensions`, `.pi/skills`, and `.pi/prompts`. If the repo is ever checked out inside a vault's `.pi` folder, keep code in `src/` and resources in `resources/` so nothing loads twice.
- **No build step.** jiti loads TypeScript directly. Pi itself uses vitest; nothing is prescribed for extensions.

## Setup

1. **The repo** is the current checkout. Use one branch per phase (`phase/<name>`).
2. **Create a sandbox vault** outside any other vault and git repo. This avoids project-local skills shadowing package skills.
3. **Lay out the repo.**
   - Put the entry point at `src/index.ts`. If the repo carries the old stub (`extensions/vault-dweller/` with an empty `StateManager`), move `index.ts` into `src/` and delete the rest.
   - Add `settings.json` to `.gitignore`.
   - Target layout:

     ```
     src/
       index.ts            composition root
       config/             schema.ts, load.ts, presets/default.ts
       shared/vault/       note, frontmatter, sections, wikilinks, link-index, names, templates, navigation, vault
       features/
         init/  notes/  projects/  inbox/  daily/  health/  context/
       assets/templates/   Idea, Insight, Question, MOC, Daily Note, Project, Kanban, PRD, Decision, Learning, Resource
     resources/
       skills/<name>/SKILL.md
       prompts/daily.md, tldr.md, capture.md
     test/
       helpers/            fake-pi.ts, tmp-vault.ts, clock.ts
       fixtures/mini-vault/
     ```

4. **Set up `package.json`.**

   ```json
   {
     "name": "vault-dweller",
     "type": "module",
     "keywords": ["pi-package"],
     "pi": {
       "extensions": ["./src/index.ts"],
       "skills": ["./resources/skills"],
       "prompts": ["./resources/prompts/*.md"]
     },
     "dependencies": { "yaml": "^2" },
     "peerDependencies": {
       "@earendil-works/pi-coding-agent": "*",
       "@earendil-works/pi-ai": "*",
       "typebox": "*"
     }
   }
   ```

   Then:
   - Run `npm i yaml` and `npm i -D typescript vitest @vitest/coverage-v8 @types/node @biomejs/biome`, plus the three host packages pinned as dev dependencies so you get types.
   - Add `tsconfig.json` (strict, `noEmit`, `moduleResolution: "bundler"`, `allowImportingTsExtensions`), `vitest.config.ts` (v8 coverage, 80% thresholds), and `biome.json`.
   - Add the scripts `test`, `test:cov`, `typecheck` (`tsc --noEmit`), and `lint` (`biome check`).
5. **Install it into the sandbox** while developing: `pi install <repo path> -l`. After publishing, test it with `pi install git:github.com/<owner>/<repo> -l`.

## Phase 1: config and activation

1. **Spike first.** Record each result in the repo's lessons learned file.
   - Does a tool registered inside `session_start` show up for the model in that same session? The design depends on it.
   - What is the import path for TypeBox's `Value` (validation)?
   - What does `yaml`'s `parseDocument(...).toString({ lineWidth: 0 })` produce for `created: 2026-03-19` and for block-list tags? Dates must stay unquoted and lists must stay in two-space block style.
   - Can `createAgentSession` (see `examples/sdk/06-extensions.ts`) run without an API key? If it can, use it for one smoke test. If not, rely on `fake-pi`.
2. **Write the config modules.**
   - `config/schema.ts` holds the TypeBox schema and `validateConfig`. Reject paths that escape the vault root.
   - `config/load.ts` holds `findVaultRoot(cwd)`, which walks up looking for `.vault-dweller.json`, and `loadConfig(root)`, which returns `{ ok, config } | { ok: false, errors }`.
   - `config/presets/default.ts` builds the default config as one object. The shape is in the PRD.
3. **Wire up `src/index.ts`.**
   - On `session_start`, find the vault. If the config is valid, register the tools once (guard against registering twice) and set a `vault` status line. If it's invalid, notify with the errors. If there's no vault, stay silent.
   - Register `/vault` with completions for `init`, `health`, and `status`.
4. **Write the tests.** Build the `fake-pi` helper, which records `registerTool`, `registerCommand`, and `on`. Then test:
   - config validation
   - `findVaultRoot` from a nested folder and from outside any vault
   - the tool registry inside and outside a vault

## Phase 2: core vault library

Build these as pure string functions plus one thin I/O wrapper, in this order:

1. **`note.ts`** splits frontmatter from body. Round-tripping must be byte-identical, including line endings.
2. **`frontmatter.ts`** reads and updates through a `yaml` Document and provides `setUpdated(today)`.
3. **`sections.ts`** edits by heading.
   - A section ends at the next heading of the same or higher level. Ignore headings inside code fences. Kanban lanes also end at `%%`.
   - `ensureSection` inserts in configured order, before any `%% kanban:settings` block.
   - `appendBullet` keeps HTML comments and italic lead lines in place.
   - `upsertBullet` keys each bullet on its first wikilink target, normalized for case and dashes. Indented children move with their bullet.
4. **`wikilinks.ts`** parses `t`, `a`, `t`, `t`, `!...`, and `\|` in tables, and skips code.
5. **`link-index.ts`** resolves by basename (ignoring case and extension) or by path suffix. `formatLinkTo` returns the shortest unique link.
6. **`names.ts`** rejects `* " \ / < > : | ? # ^ [ ]` in titles, and `canonicalMocName("MOC -- x")` returns `MOC — x`.
7. **`templates.ts`** fills `{{date}}`, `{{date:FMT}}`, `{{time}}`, `{{title}}`, `{{project}}`, `{{slug}}`, and section bodies, then strips lines that still hold only a placeholder.
8. **`navigation.ts`** provides `registerInHub`, `unregister`, `refreshMapsPreview`, `addToMoc`, and `addSeeAlso`. Each one bumps `updated`. A note's owning hub is its nearest ancestor folder note (`X/X.md`).
9. **`vault.ts`** gets config and clock injected. Every write goes through `withFileMutationQueue`, and create refuses to overwrite.
10. **Build the `test/fixtures/mini-vault/` fixture.** It should model a representative vault structure, with em-dash MOCs, a `MOC --` broken link, an orphan, an unregistered note, and a Kanban board. Write table-driven tests for every module. This phase carries most of the coverage.

## Phase 3: `/vault init`

1. **Write `plan()` and `apply()`.** `plan()` returns a list of actions (`mkdir`, `create`, `merge-json`, `managed-block`, `skip`) and `apply()` executes them. Write the config file last.
2. **Create the content.**
   - Folders.
   - Hubs: frontmatter, H1, purpose, `## How to use`, and the configured sections.
   - `Maps/Maps.md` with grouped hub entries.
   - Templates, with no placeholder wikilinks.
   - `.agents/lessons_learned.md`.
   - The AGENTS.md block between `<!-- vault-dweller:start -->` and `<!-- vault-dweller:end -->`.
3. **Merge `.obsidian` settings without clobbering.**
   - `daily-notes.json`, `templates.json`, `app.json`: add missing keys only, and report conflicts.
   - `core-plugins.json`: set daily-notes and templates only if absent.
   - Never touch community plugins. Tell me to install obsidian-kanban instead.
4. **Command flow.** Pick the content root (default `Brain`), show a summary, confirm, apply, then register the tools. Support `--dry-run` and `--yes`.
5. **Tests.**
   - An empty dir produces the full tree, and a second run produces only skips.
   - A conflicting `app.json` value is preserved.
   - AGENTS.md content outside the block survives.
   - `--dry-run` writes nothing.
6. **Live check.** Run init in the sandbox, open it in Obsidian, and confirm the daily note and templates work.

## Phase 4: structural tools

Build them in dependency order:

1. `vault_inbox`, `vault_daily`
2. `vault_create_note`
3. `vault_set_status`
4. `vault_create_project`, `vault_kanban`
5. `vault_create_moc`
6. `vault_archive`, `vault_project_status`

Each tool follows the same rules:

- `executionMode: "sequential"`, a one-line `promptSnippet`, and one to three `promptGuidelines`.
- Values that come from config are checked at runtime.
- Compute every change before writing anything, then write new files first and navigation files after.
- On failure, report exactly which files changed.
- Archive returns `needsReview` backlinks rather than rewriting prose.

Test each tool's `execute` against a temporary copy of `mini-vault`. Check duplicate errors and idempotent upserts. Then run a capture → project → card → archive session in the sandbox and inspect the diffs.

## Phase 5: context and skills

1. **License check.** Check the licenses of the Obsidian syntax skills, `json-canvas`, and `defuddle` before bundling them. If they can't be bundled, document how to install them instead.
2. **Context.** Write `renderStandard(config)`, the single source for the AGENTS.md block, and `inject.ts`, which adds `vault_context` only inside a vault.
3. **Workflow skills.** Write these to call the tools: `daily`, `tldr`, `capture`, `process-inbox`, `create-project`, `write-a-prd`, `create-moc`, and `vault-review`. For `tldr`, commit only when `git.commitAfterTldr` is true, and stage named files, never with `-A`. Leave out private paths, personal identifiers, and project names.
4. **Generic skills and prompts.** Add the generic skills that pass the license check, plus the prompts `daily.md`, `tldr.md`, and `capture.md`.
5. **Tests.** Add a frontmatter lint for every SKILL.md, a snapshot test of `renderStandard`, and a check that injection only happens inside a vault.
6. **Live check.** Run `/daily` → work → `/tldr` in the sandbox.

## Phase 6: health linter

1. **One file per check**, each returning `{ check, severity, path, message, fix? }`. The full list of checks is in the PRD.
2. **Build the rest of the linter.**
   - `run.ts` scans only the root, skips Templates and `health.ignore` globs, and builds the link index once.
   - `fix.ts` applies only the safe fixes.
   - `report.ts` groups findings by check, showing at most 20 per check.
   - Wire up the `vault_health` tool and `/vault health [--fix]`.
3. **Navigation reminder.** Write `nav-reminder.ts`. It records `write` and `edit` paths from `tool_result`, then on `agent_end` checks those paths for broken links and unregistered notes and shows a notification. It never blocks.
4. **Tests.**
   - A positive and a negative fixture for each check.
   - A second `--fix` run changes nothing.
   - A scan of about 1,000 notes finishes in under a second.
5. **Run it on a temporary copy of a representative vault.** It should find the known broken links and leftover placeholder links.

## Phase 7: migrate an existing vault

This phase changes a real vault, so do it together with the vault agent.

1. Write the vault's `.vault-dweller.json` by hand. Start from the preset, add any local hubs, configure ignored paths, and copy over the writing rules.
2. Run `/vault init --dry-run`, review the output, then apply it.
3. Rewrite AGENTS.md around the managed block. Keep any user-authored sections.
4. Remove generic skills that the package now provides. Keep vault-specific workflows.
5. Run health with `--fix`, then fix the rest by hand.
6. Install from git and confirm Pi starts with no duplicate-command or skill-collision warnings.

## Every phase

- Run `npm run typecheck && npm run lint && npm run test:cov` and keep coverage at or above 80%.
- Run a live check in the sandbox.
- Record lessons learned in the repo.
- Move the card on the vault's Kanban.

## Related

- `docs/PRD.md`: requirements and acceptance criteria
- `AGENTS.md`: working rules, design principles, and testing standards
