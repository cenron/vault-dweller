# Vault Dweller PRD

Product requirements for Vault Dweller, a Pi package that turns an Obsidian vault's conventions into tools, skills, and a config file. This PRD records requirements and decisions, not an approved execution plan. Progress is tracked on the project Kanban. The step-by-step plan is `docs/build-guide.md`.

## Problem

This vault runs on prose. AGENTS.md, 16 skills in `.agents/skills/`, and 14 templates describe the structure, and rules like "keep navigation current" only hold when the model remembers them. It often doesn't.

An inventory on 2026-10-09 found the drift that results:

- About 15 broken wikilinks, including `Book Club` and MOC links written as `MOC --` instead of `MOC —`.
- Template placeholders such as `Idea 1` leaking into real notes as broken links.
- Project notes tagged `type/moc`.
- No templates for projects, Kanban boards, PRDs, or decisions, even though skills say to read them.
- Decision filenames in two styles.
- AGENTS.md describing folders and Projects sections that don't match the vault.

Starting a second vault means copying all of this by hand, drift included.

## Intended users

I'm the first user. I want to start a fresh vault with the same structure and have an agent grow it to the same standard. I also want the existing vault held to that standard.

Anyone running Pi with an Obsidian vault is the secondary user. The package should work without relying on private project details or personal workflows.

## Goals

1. Bootstrap a new vault in one command: folders, hub notes, Maps, templates, Obsidian settings, an AGENTS.md block, and lessons learned.
2. Make structural changes deterministic. Creating, promoting, and archiving notes and projects updates hubs, Maps, MOCs, and Kanban boards in the same operation, without depending on the model remembering.
3. Make drift visible with a health linter. It fixes the safe cases and reports the rest.
4. Keep judgment work in skills: daily sessions, wrap-ups, inbox processing, PRDs, grilling, and gardening.
5. Migrate an existing vault onto the package while preserving its local workflows.

## Success signals

- `/vault init` on an empty folder produces a vault that opens cleanly in Obsidian, with the daily note and templates wired up. Running it again changes nothing.
- A capture → process → project → archive session in a sandbox vault leaves zero `broken-link` and `unregistered` findings.
- `/vault health` on a copy of this vault reports the known broken links and placeholder leaks.
- After migration, this vault loads with no duplicate-command or skill-collision warnings, and health is clean apart from ignored paths.

## Non-goals

- Installing Obsidian community plugins. Init tells me to install obsidian-kanban rather than doing it.
- A general rename tool. Obsidian already rewrites links when I rename inside the app.
- Blocking the agent's raw `write` and `edit` tools. Nudges are enough.
- Multiple presets or a preset picker. One default preset is enough until a second vault proves otherwise.
- Health fixes that need judgment, such as inventing descriptions for unregistered notes.
- Vault-specific workflows stay in the vault's own `.agents/skills`.

## Product scope

The package has five parts.

**Vault config.** A `.vault-dweller.json` file at the vault root holds the vault's standard. It covers folders, hubs and their sections, Maps groups, note types, the tag prefixes, the status lifecycle, Kanban lanes, the daily note format, writing rules, health ignores, and git behavior. Init writes the full default preset into it, so a package update never silently changes an existing vault.

**`/vault` command.** `init`, `health [--fix]`, and `status`. It's available everywhere, so init can run in an empty folder.

**Structural tools.** These are registered only inside a vault.

| Tool | Purpose |
|---|---|
| `vault_create_note` | Create an idea, insight, question, learning, resource, PRD, or decision note from its template. Registers it in its hub or project note, adds it to MOCs, and refreshes the Maps preview. |
| `vault_create_moc` | Create `MOC — Theme` with a scope line and reciprocal See also links, and add it to Maps. |
| `vault_set_status` | Move a note through seed → growing → evergreen, and move its hub bullet when the status maps to another section. |
| `vault_archive` | Move a note under Archive, then add `status: archived`, the `archived` date, and the archive callout. Unregisters the note and reports backlinks that need review. |
| `vault_create_project` | Scaffold the project note, Kanban, Decisions folder, and optional PRD, then register them in Projects, Maps, and MOCs. |
| `vault_project_status` | Move a project between Active, Parked, and Archived, and record the change on its Kanban. |
| `vault_kanban` | Add, move, complete, reopen, or remove cards without touching the board settings block. |
| `vault_inbox` | Capture to Unprocessed, or mark an item processed with a dated log line. |
| `vault_daily` | Open today's note from its template, or append a session log under `## Log`. |
| `vault_health` | Run the linter and return all findings. |

**Skills and prompts.** These are workflow skills rewritten to use the tools: `daily`, `tldr`, `capture`, `process-inbox`, `create-project`, `write-a-prd`, `create-moc`, and `vault-review`. Generic skills (`grill-me`, `no-ai-slop`, the Obsidian syntax skills, `json-canvas`, `defuddle`) ship once their licenses allow it. Prompt templates cover `daily`, `tldr`, and `capture`.

**Context.** A single function renders the vault standard from config. Init writes it into a managed block in the vault's AGENTS.md, so Pi and other agents both read it. At the start of each turn the extension adds only a short `vault_context` section: vault root, content root, today's date, the daily note path, and a reminder to use `vault_*` tools for structural changes.

## User flows

**New vault.** I run `pi` in an empty folder and type `/vault init`. Init asks for the content root (default `Brain`), shows what it will create, and applies it after I confirm. Then it reminds me to install obsidian-kanban. Tools become available in the same session.

**Daily session.** `/daily` opens today's note, lists inbox items and active projects, and asks what I'm working on. During the session I capture, create notes, and move cards through tools. `/tldr` logs the session under `## Log` and spins out ideas, insights, or questions. It commits to git only if config allows it.

**Gardening.** `/vault health` summarizes findings by check. `--fix` applies the safe fixes. The `vault-review` skill then works through orphans, unregistered notes, and stale statuses with me.

**Migration.** I write this vault's config by hand from the preset and run init as a dry run, then apply. Generic skills move out of `.agents/skills`, health fixes go in, and the install switches to the git package.

## Requirements and acceptance criteria

### Config and activation

- The extension finds the vault by walking up from the working directory to `.vault-dweller.json`. Outside a vault, only `/vault` exists, and nothing else is registered or printed.
- An invalid config shows a warning naming the file and the first errors. The extension never loads a partial config.
- Config paths can't escape the vault root. A root like `../..` is rejected.
- `folders` and `hubs` are open records, so a vault can add `blog` or `lifestyle` hubs without code changes.

### Init

- Creates only what is missing and never overwrites a file. A second run reports only skips, and every file stays byte-identical.
- Writes the config file last, so an interrupted run doesn't look finished.
- Merges Obsidian settings without clobbering them:
  - Creates `daily-notes.json`, `templates.json`, and `app.json` if they're missing. If they exist, it only adds missing keys and reports conflicting values.
  - Never touches `community-plugins.json`.
- AGENTS.md: creates the file, or inserts or replaces only the content between `<!-- vault-dweller:start -->` and `<!-- vault-dweller:end -->`. User-authored content outside the block survives.
- Templates contain no placeholder wikilinks.
- Asks before initializing a folder that looks like a code repository, and offers the ancestor vault when one already exists above the current folder.
- `--dry-run` writes nothing. `--yes` skips confirmation.

### Navigation behavior

- A note's owning hub is its nearest ancestor folder note (`X/X.md`). This covers top-level hubs, projects, and nested hubs like Lifestyle/Career without extra config.
- Hub section matching ignores case and whitespace, so existing hubs keep working. Tools never delete sections they don't recognize.
- Registering a note never duplicates it. Each bullet is keyed by its first wikilink target, normalized for case and dash variants.
- Every edit to a hub, MOC, or Maps sets `updated` to today.
- Maps preview bullets under a hub are regenerated from that hub's preview section. Maps no longer carries a "latest session" link.
- Creating a MOC adds reciprocal See also lines and an entry in Maps. Fewer than `mocMinNotes` entries produces a warning, not a refusal.

### Tools

- Creating a note with a duplicate name fails and names the existing note. Projects also check Archive.
- Multi-file operations compute everything first, then write new files before navigation files. On failure, they report exactly which files changed.
- Archive rewrites only path-qualified links to the moved note. Backlinks and MOC mentions come back as `needsReview` for me or the agent to reword.
- Kanban card matching tries exact text first, then a unique substring. An ambiguous match fails and lists the candidates. Card dates and the settings block are preserved.
- Tools that write files run sequentially, never in parallel.

### Health

- Checks:
  - Missing or invalid frontmatter.
  - Invalid `created` or `status`.
  - Tags outside the configured prefixes.
  - Broken links, with a suggestion when a dash or case variant resolves.
  - Orphans. Hubs, Maps, and daily notes are exempt.
  - Unregistered notes.
  - Projects missing a Kanban or Decisions folder.
  - MOCs missing See also or a Maps entry.
  - Stale hubs.
  - Leftover `{{...}}` placeholders.
  - A missing AGENTS.md block.
- Only the configured root is scanned. Templates and `health.ignore` globs are skipped.
- `--fix` changes only what needs no judgment:
  - Unique near-miss links.
  - Status casing.
  - Missing `updated` on hubs and MOCs.
  - A missing Kanban settings block.
  - A missing Decisions folder.

  A second `--fix` run changes nothing.
- After an agent turn that used raw `write` or `edit` under the root, a notification flags any new broken or unregistered notes. It never blocks.
- A scan of about 1,000 notes finishes in under a second.

### Skills

- Every SKILL.md has a lowercase-hyphen name that matches its folder, and a description under 1,024 characters.
- `tldr` stages named files and never runs `git add -A`. It commits only when `git.commitAfterTldr` is true. The default is false.
- Skills contain no private paths, personal identifiers, or personal project names.

## Constraints and dependencies

These were verified against the installed pi-coding-agent 1.1.0 source on 2026-10-09.

- **Packaging.** The package ships through the `package.json` `"pi"` manifest, and installs with `pi install git:github.com/<owner>/<repo>`, or a local path during development. Host packages (`@earendil-works/pi-coding-agent`, `pi-ai`, `typebox`) are `peerDependencies` with `"*"` ranges.
- **Double loading.** Pi auto-discovers `.pi/extensions/`, `.pi/skills/`, and `.pi/prompts/` in a project. Code lives in `src/` and resources in `resources/`, declared only in the manifest, so a checkout inside a vault's `.pi` folder never loads twice.
- **Skill shadowing.** On a name collision, Pi keeps the first skill it discovers, and project `.agents/skills` load before package skills. Project-local `daily` and `tldr` skills can shadow package versions. Development testing therefore happens in an isolated sandbox vault, because skill discovery climbs to the git root.
- **Frontmatter edits.** These need a round-trip YAML library. Pi's `parseFrontmatter` can only read. The package depends on `yaml` directly.
- **File writes.** These go through `withFileMutationQueue`, which deadlocks if nested on the same path, so there's one read-modify-write per file per call.
- **No build step.** Pi loads TypeScript through jiti. Tests use vitest. Coverage target is 80%, per Design Principles.
- **Licensing.** The Obsidian syntax skills, `json-canvas`, and `defuddle` appear to be third-party and carry no license metadata. They ship only if their license allows; otherwise the README documents how to install them.

## Agreed decisions

- 2026-10-09 Distribute as a global Pi package: one package installed globally, active only where a vault config exists.
- 2026-10-09 Materialized vault config: a preset written in full into `.vault-dweller.json` rather than referenced.
- 2026-10-09 Hybrid enforcement with tools and skills: tools for structure, a linter for drift, and skills for judgment. Raw edits aren't blocked.
- 2026-10-09 Migrate the existing vault last: build and validate on a sandbox vault, then migrate the vault in its own phase.
- 2026-10-09 Build in the repository checkout. The vault holds the PRD and project tracking.

Implementation choices already settled:

- **Code layout.** Code lives in `src/` with feature folders (`init`, `notes`, `projects`, `inbox`, `daily`, `health`, `context`), plus `shared/vault` for the markdown library and `config/` for the schema, loader, and preset. The composition root is `src/index.ts`.
- **Markdown editing.** Editing is line-based with no markdown AST, so unknown content stays byte-for-byte.
- **Projects sections.** Active, Parked, and Archived. A project's state is its section in Projects, and `status` keeps the shared lifecycle.
- **Tag type.** Project notes get `type/project` going forward.

## Open questions and assumptions

- Can the third-party skills be bundled, or only documented?
- Does anything outside Pi still use `.agents/commands/daily.md` and `tldr.md`?
- Should the existing vault's "New projects" prose section stay in Projects alongside Active, Parked, and Archived?
- Should PRDs get their own tag, such as `type/prd`? This PRD follows the existing Pantry Memory precedent of `type/moc`.
- Is the `agent_end` navigation reminder useful, or just noise? Try it in the sandbox before keeping it.
- I'm assuming a tool registered during `session_start` is visible to the model in that same session. Verify this before building on it.
- I'm assuming `createAgentSession` can run headless without an API key, which would make SDK smoke tests possible. Verify this too.

## Related

- Vault Dweller: project note
- Vault Dweller Kanban: phases and progress
- Design Principles: code and testing standards for the package
- Maps and Projects: the navigation this package encodes
- MOC — Tech Stack
