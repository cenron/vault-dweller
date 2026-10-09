# Vault Dweller: agent guide

## Primary directive: keep the public repository free of private information

This is a public repository. Do not add or retain personal names, private project or vault names, account identifiers, or machine-specific paths and directory references in tracked files, examples, tests, comments, commit instructions, or generated content. Project attribution explicitly approved by the repository owner is allowed. Use generic placeholders and relative paths elsewhere. Review changes for accidental disclosure before presenting them. This directive takes priority over all other instructions in this file.

Vault Dweller is a Pi package that bootstraps Obsidian vaults with a second-brain structure (folders, hubs, Maps, MOCs, templates, Obsidian settings) and keeps them healthy. It does this through structural tools, a health linter, and workflow skills. It encodes a reusable Obsidian vault structure.

## Source of truth

- `docs/PRD.md`: requirements, acceptance criteria, config shape, tool list, health checks, agreed decisions, and open questions.
- `docs/build-guide.md`: verified Pi facts, the target layout, and the phase-by-phase build plan.
- `.agents/lessons_learned.md`: read at the start of every task. Update it after corrections, surprises, framework quirks, or spike results, with the date, what happened, and the takeaway.

If code and docs disagree, stop and ask which one is right. Don't silently pick one.

## How we work

- I'm building this myself. Work one phase at a time, following `docs/build-guide.md`.
- A plan, even an approved one, is not permission to implement. Wait for an explicit go before changing files.
- Don't start the next phase until I say so.
- Explain and review when I ask. Keep changes small, and show me what changed.
- Track progress on the project Kanban. Keep vault changes out of this repository. The final migration phase happens with the vault agent.

## Never guess

- Verify Pi behavior against the installed source before relying on it. That covers API signatures, events, the package manifest, and skill discovery.
- The docs are in `node_modules/@earendil-works/pi-coding-agent/docs/`, and the authoritative types are in `dist/core/extensions/types.d.ts`.
- `examples/extensions/` has working patterns.
- Facts in `docs/build-guide.md` were verified against Pi 1.1.0 on 2026-10-09. Re-check them if the version changes.
- If the docs and source don't settle a question, ask me.

## Package rules

- Host packages (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`, `typebox`) are `peerDependencies` with a `"*"` range, plus pinned devDependencies for types. Never put them in `dependencies`.
- Resources are declared in the `package.json` `"pi"` manifest: code in `src/`, skills in `resources/skills/`, prompts in `resources/prompts/`.
- Use `StringEnum` from `@earendil-works/pi-ai` for string enums in tool parameters, not `Type.Union` of literals.
- Write files through `withFileMutationQueue`. Do one read-modify-write per file per call and never nest calls on the same path. Mutating tools use `executionMode: "sequential"`.
- Register vault tools only when `.vault-dweller.json` is found. Outside a vault, only `/vault` exists.
- Guard UI calls with `ctx.hasUI`.

## Design principles

- **Simplicity first.** No abstractions for hypothetical needs. Three similar lines beat a premature helper.
- **Small files with clear boundaries.** One concept per file. Use feature folders under `src/features/<name>/`, and `src/shared/` only for proven reuse.
- **Composition at the entry point.** `src/index.ts` wires everything. Dependencies such as config, clock, and Pi come in through constructors or factory arguments, never globals.
- **Narrative code.** Guard clauses at the top, and orchestrators that read like an outline with helpers doing the work.
- **Validate at boundaries only.** Validate config load and tool parameters, and trust internal code.
- **Idempotent operations.** Re-running init, `--fix`, or a register call must not duplicate or clobber anything.
- **Delete, don't comment out.** No dead code and no compatibility shims.
- **Consistency.** Once a pattern exists, use it everywhere. No mixed styles.

## Testing and verification

- vitest, with v8 coverage at 80% or higher. Write tests for new functionality.
- **Tests are sacred.** Never change a test just to make it pass. If a test fails, assume the code is wrong until the real behavior is confirmed.
- Test against temporary copies of `test/fixtures/mini-vault/`, never against a real vault.
- **Before calling work done:**
  - Run `npm run typecheck && npm run lint && npm run test:cov`.
  - Run a live check in a temporary sandbox vault, installed with `pi install <repo path> -l`, then `/reload`.
  - Report the commands you ran and what they showed.
- After a refactor, do a consistency pass: mixed patterns, naming, orphaned imports, and layer violations.

## Git

- Trunk-based: `main` always works. Use one short-lived branch per phase: `phase/<name>`, `feat/<name>`, or `fix/<name>`.
- Commit messages are concise and imperative, and explain why.
- Stage specific files. Never run `git add .` or `git add -A`.
- Commit or push only when I ask.

## Writing

- Docs, skills, and messages use sentence-case headings, direct prose, and short paragraphs.
- Avoid filler words: delve, leverage, robust, seamless, crucial, vital, enhance, showcase, foster, cutting-edge.
