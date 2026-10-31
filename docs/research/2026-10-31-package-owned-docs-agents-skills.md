---
date: 2026-10-31T16:02:08-04:00
git_commit: 34fa8600b30907f23a11e1824aa878e2159e926d
branch: main
repository: dashhaus
topic: "1 but first, research if it even makes sense. I am optimizing for packages having their own concerns including documentation, skills, AGENTS, etc..."
tags: [research, codebase, packages, documentation, agents, skills]
status: complete
last_updated: 2026-10-31
last_updated_note: "Follow-up: publishing preparation makes package READMEs the first cut, not a repo-wide split."
---

# Research: Package-owned docs, skills and AGENTS

## Research Question

1 but first, research if it even makes sense. I am optimizing for packages
having their own concerns including documentation, skills, AGENTS, etc...

## Summary

A wholesale per-package split of documentation, skills and `AGENTS.md` does
not make sense in the current tree. The **code** boundary is already package
owned, but these three surfaces are repo-level contracts and tooling:

- Orb and Field are not packages, so their two largest specs have nowhere to
  move yet.
- The docs are cross-cutting: `docs/cards.md` spans both skins,
  `docs/deploy.md` spans the dashboard schema and the deploy CLI, and
  `docs/performance.md` and `docs/release.md` span all three packages.
- Root `AGENTS.md` is both the repository contract and a test input; tests and
  generators read it by `process.cwd()`.
- The skills are shared infrastructure whose lockfile and tooling are rooted at
  the repository, not at a package.

A targeted split does make sense: package READMEs at publish time, a
package-exclusive doc only where it maps to one package and package consumers
need it, and package-local `AGENTS.md`/skills only if work routinely starts in
that package. None of those is worth doing before the orb/field packaging and
publish decisions are settled.

## Detailed Findings

### The package boundary is code-only today

The workspace declares `packages/*` and `src/skins/*`
(`package.json:67-70`). The three shared packages are real workspace packages
with their own manifests, exports, tests and `files` allowlists
(`packages/core/package.json:1-12`, `packages/dashboard/package.json:1-12`,
`packages/deploy/package.json:1-16`).

The reference skins are the exception. `scripts/packages.mjs:5-8` states that
orb and field are folders under `src/skins`, not workspace packages; only
generated skins are packages, because `src/skins/*` matches the package-less
folders but npm ignores them (`docs/research/2026-10-29-monorepo-readiness.md:700-704`).
Publishing the reference skins is explicitly deferred
(`docs/research/2026-10-29-monorepo-readiness.md:627`).

Consequence: "each package owns its documentation" cannot include `docs/orb.md`
or `docs/field.md` today, because the owners are not packages. It also cannot
cover the shared card/design system, which is a package boundary the code still
draws inside the skins (`docs/research/2026-10-29-monorepo-readiness.md:744-747`).

### Package docs would not ship under the current release rules

The release check rejects tests, stories, `docs/`, `research/` and `.agents/`
inside a packed package (`scripts/release/verify.mjs:4,41`). A package-local
`docs/` directory would be treated as a packaging defect, not as the package's
documentation. A package-root README is not rejected by that check, but the
three packages currently have no README; the only tracked READMEs are the root
front page and `research/README.md`.

So package-owned docs would either be repo-only (the same visibility as today,
with a longer path) or require a release-policy change before they can reach a
consumer. Package READMEs are the one surface that is compatible with the
current tarball rules.

### The docs are intentionally cross-cutting

| File | Lines | Current owner(s) | Why a package split is not 1:1 |
| --- | ---: | --- | --- |
| `docs/cards.md` | 369 | Orb and Field cards | Orb sections and Field subsections share footprints and per-card behaviour |
| `docs/deploy.md` | 323 | `@dashhaus/dashboard` schema + `@dashhaus/deploy` CLI | The YAML reader and the CLI that writes it are different packages |
| `docs/performance.md` | 188 | core marks + both skins + deploy collector | One measurement workflow crosses all three |
| `docs/release.md` | 137 | all three public packages | One version, one packing and verification flow |
| `docs/home-assistant.md` | 157 | mostly `@dashhaus/core` | The data boundary; still references both skins' Lovelace cards |
| `docs/contract.md` | 80 | `@dashhaus/dashboard/card` + `./schema` | A third-party skin contract, not internal package docs |
| `docs/skins.md` | 66 | generators and generated skins | Repo workflow, not a runtime package |
| `docs/orb.md` | 139 | Orb (not a package) | The skin is a folder |
| `docs/field.md` | 121 | Field (not a package) | The skin is a folder |

These files are also executable inputs:

- `verify/conformance.ts:9` reads every doc by `process.cwd()`.
- `verify/orb-conformance.test.ts:55-56,67-68,84` requires a card's class
  prefix in `AGENTS.md`, its section in `docs/cards.md`, and its domain in
  `docs/deploy.md`.
- `verify/field-conformance.test.ts:65-66,82-83` does the same for Field,
  including a subsection in `docs/cards.md`.
- The Design rules pages import the specs directly:
  `src/skins/orb/stories/DesignRules.mdx:3,18` and
  `src/skins/field/stories/DesignRules.mdx:3,27`.
- The generators insert registrations into root docs through
  `scripts/packages.mjs:131-134` (`cardsDoc`, `deployDoc`, `fieldDoc`,
  `skinDoc`).

Moving a doc is therefore a change to tests, Storybook imports and generator
seams in the same cut. That is possible, but it is not a file move.

### `AGENTS.md` is a contract and a test fixture

`AGENTS.md` is 173 lines and carries the cross-package vocabulary, commands,
verification gate, layout, Storybook order, hard rules and the card/skin
workflows (`AGENTS.md:1-173`). Its sections mix owners: the layout paragraphs
cover core, dashboard, deploy and both skins; the hard rules cover both skins;
the commands are repository-wide.

It is also read by tests by cwd path (`verify/orb-conformance.test.ts:56`,
`verify/field-conformance.test.ts:66`). A package-local `AGENTS.md` would be a
second input unless those assertions learn the new location.

The runtime discovery rules make a full split actively risky. omp discovers
standalone `AGENTS.md` files by walking from the current directory to the
repository root: a session started at the repo root sees only the root file,
not a file in `packages/core/`; a session started in a package sees both
([omp context files](omp://context-files.md)). Splitting rules into package
files would hide them from the root session — where the repo's commands run —
unless the root file keeps a linked index or duplicates the rules.

### Skills are shared, root-locked infrastructure

There are 19 skills under `.agents/skills`: 15 third-party skills recorded in
`skills-lock.json` (mostly `emilkowalski/skills`) and four repo-local ones
(`attention-budget`, `home-assistant-integration`, `impeccable`,
`row-identity`). `.claude/skills` is 19 symlinks into the same tree.

The lockfile is root-anchored. Prior research measured that the `skills` CLI
reads `join(process.cwd(), "skills-lock.json")` and exposes no config-path flag
(`docs/research/2026-10-30-root-tooling-config-brief.md:28,48`). Moving skills
into packages would require per-package locks or a change to how
`npx skills update` is run.

The skill runtime is also cwd-scoped: `.agents/skills` is a project provider
root discovered while walking from cwd, and `.claude` is read only from the
current directory's config directory
([omp skills](omp://skills.md)). A package-local skill would disappear from
root-level sessions and collide with the shared copy when both levels load.

The four local skills map unevenly: `attention-budget` and `row-identity` are
Orb design rules, `home-assistant-integration` is the `@dashhaus/core` HA
boundary, and `impeccable` is cross-skin design review. Only the HA one maps to
a real package; the Orb ones map to a folder.

### Prior decisions already treat this as repo tooling

- The monorepo readiness note says the docs-editing generators are repo tooling,
  not a product (`docs/research/2026-10-29-monorepo-readiness.md:629-632`).
- The rename brief explicitly kept the `AGENTS.md`/`README.md`/skills split out
  of its scope (`docs/research/2026-10-30-monorepo-rename-brief.md:51`).
- The root-tooling brief left `AGENTS.md`, `README.md` and `TODOS.md` at the
  root, and left `skills-lock.json` there because the CLI cannot be pointed
  elsewhere (`docs/research/2026-10-30-root-tooling-config-brief.md:13,28`).

## Architecture Documentation

The current ownership model is:

- **Package-owned:** source, tests, exports, build output, package manifests and
  the package's declared public contract. The three shared packages and
  generated skins have this today.
- **Repo-owned:** the front-page README, the cross-package design specs and
  card/deploy/performance/release docs, `AGENTS.md`, `skills-lock.json`,
  `.agents/skills` and the generator seams. These are what every package and
  every agent session shares.
- **Skin-owned but not packaged:** Orb's and Field's visual language, tokens,
  cards, stories and Lovelace cards. Their specs sit in repo docs because the
  skins are not packages.

A package-owned model would need three conditions before it pays:

1. The owner is a package. That means deciding whether orb and field become
   packages, which is still open (`docs/research/2026-10-29-monorepo-readiness.md:627`).
2. The artifact has a consumer outside the repo. Repo-only docs gain little
   from a longer path; package READMEs gain an npm page.
3. The tool can discover it from where work starts. Root-level agent sessions
   need the root index; package sessions can load package files.

## Code References

- `package.json:67-70` - the workspace globs, `packages/*` and `src/skins/*`.
- `scripts/packages.mjs:5-8` - reference skins are not workspace packages.
- `scripts/packages.mjs:131-134` - the root doc seams generators edit.
- `scripts/release/verify.mjs:4,41` - packed packages must contain no repo docs.
- `packages/core/package.json:1-12` - a package's manifest, `files` and exports.
- `verify/conformance.ts:9` - docs are read by cwd path.
- `verify/orb-conformance.test.ts:55-56,67-68,84` - AGENTS and docs are test inputs.
- `verify/field-conformance.test.ts:65-66,82-83` - the same for Field.
- `src/skins/orb/stories/DesignRules.mdx:3,18` - Storybook imports `docs/orb.md`.
- `src/skins/field/stories/DesignRules.mdx:3,27` - Storybook imports `docs/field.md`.
- `AGENTS.md:1-173` - the cross-package contract and workflow.
- `skills-lock.json:1` - the root skill lock.
- `.claude/skills` - symlinks into `.agents/skills`, one level deep.

## Historical Context

- `docs/research/2026-10-29-monorepo-readiness.md:627` defers publishing the
  reference skins.
- `docs/research/2026-10-29-monorepo-readiness.md:629-632` treats docs-editing
  generators as repo tooling.
- `docs/research/2026-10-30-monorepo-rename-brief.md:51` keeps the
  `AGENTS.md`/`README.md`/skills split out of the rename.
- `docs/research/2026-10-30-root-tooling-config-brief.md:28,48` records the
  `skills` CLI's cwd-only lockfile.
- `docs/research/2026-10-29-monorepo-readiness.md:744-747` records that the
  reference skins are still folders, not packages.

## Open Questions

- Do the public packages ever ship a package README or API docs? That is the
  only doc surface the current tarball rules accept.
- Do orb and field become packages? Their specs cannot move until they do.
- Do agent sessions normally start at the repo root or in a package? That
  decides whether package-local `AGENTS.md`/skills are discoverable in practice.
- Should the docs be shipped with the packages, or stay repo-only? Shipping
  requires changing the release check, not just moving files.

## Follow-up Research: 2026-10-31T16:04:17-04:00

### Follow-up Question

This would be in preparation of publishing packages.

### Follow-up Summary

Publishing changes what "package-owned docs" should mean, not whether the whole
repo should split. The publishable unit is the three public packages
(`docs/release.md:3`), and their first missing package-owned artifact is a
README. The current tarball rules accept a package-root README and reject a
package `docs/` directory; a probe packing a minimal package with
`files: ["dist"]` produced `README.md`, `dist/index.js` and `package.json`.
The repo's specs, `AGENTS.md` and skills still sit above the packages: they are
cross-cutting, test inputs and agent context loaded from the repo root.

So the publish-prep cut is: package READMEs now; package-exclusive docs only if
they are meant to ship, which requires a release-policy change; AGENTS/skills
stay root unless they are deliberately part of a package's product surface.

### Follow-up Findings

- Publishing covers only `@dashhaus/core`, `@dashhaus/dashboard` and
  `@dashhaus/deploy`; the skins, Storybook and bundle stay private
  (`docs/release.md:3`).
- `files` is the package allowlist and the release docs say tarballs contain no
  repository docs (`docs/release.md:33`); `scripts/release/verify.mjs:41`
  rejects `package/docs/` and `.agents/` in a tarball.
- npm's `files` allowlist does not exclude `README.md`: a throwaway package with
  `files: ["dist"]` packed `README.md`, `dist/index.js` and `package.json`.
  `README.md` is therefore the one library-documentation surface that can ship
  under the current rules without changing them.
- The publish flow is manual and package-ordered
  (`docs/release.md:74-86`); the first release is TODOS item 6, after the PII
  rewrite and a green main.
- Package-local `AGENTS.md` or `.agents/skills` would ship only if added to
  `files`, and an agent in a consuming repo does not load context or skills from
  `node_modules`; omp's context walk and skill roots start at the consuming
  repo. If agent guidance is a product surface, the README must point at it.
- Orb and Field are still not packages; publishing them is deferred
  (`docs/research/2026-10-29-monorepo-readiness.md:627`), so their specs stay in
  root docs.

### Revised Recommendation

1. Add `README.md` to each of the three publishable packages, linking the
   existing root docs rather than duplicating them:
   - core: `docs/home-assistant.md`, and `docs/contract.md` where relevant;
   - dashboard: `docs/contract.md`, `docs/deploy.md` for the YAML surface;
   - deploy: `docs/deploy.md`, `docs/release.md`.
2. Make the release check assert each tarball has a non-empty package README
   and that its relative links resolve; keep the no-`docs/` rule unless API docs
   become a deliberate product artifact.
3. Leave cross-cutting docs at root. Do not move a spec until its owner is a
   package and the doc is package-exclusive.
4. Keep `AGENTS.md` and skills at root. Ship them only if a package is meant to
   carry agent guidance, and then point at them from the README.
5. Re-scope TODOS item 1: "package READMEs before the first publish" now;
   "package-owned AGENTS/skills and cross-cutting doc split" stays deferred.

### Follow-up Code References

- `docs/release.md:3` - the three publishable packages; skins stay private.
- `docs/release.md:33` - `files` is the allowlist and tarballs omit repo docs.
- `docs/release.md:74-86` - manual publish order.
- `scripts/release/verify.mjs:41` - package `docs/` and `.agents/` are rejected.
- `packages/core/package.json:7-9` - `files: ["dist"]`.
- `packages/dashboard/package.json:7-9` - `files: ["dist"]`.
- `packages/deploy/package.json:12-15` - the deploy `files` allowlist.
- `TODOS.md:12` - first npm release.

### Follow-up Open Questions

- Do the packages need API docs in the tarball, or is a README link to the repo
  docs enough?
- Is agent guidance a product surface for these packages, or repo tooling only?
