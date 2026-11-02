# Study brief

The brief that starts a study run (skins.md → [Running a study](skins.md#running-a-study)): copy the block below,
replace `<name>` and `<Name>`, attach the reference image, and hand it to a fresh agent in this repository. The rules
an agent follows during the run live in skins.md, whoever started it; this page is only the request. When the
generators change what a study gets, change this brief with them: `verify/studies.test.ts` holds it to the generator's
flag, folders and Storybook section.

```markdown
# Outcome
Create a study named <name> in this repo: a skin built only with the repository's generators whose visual language
(palette, type, parts, page) reads as the reference image attached to this message. A study is kept to learn from and
never ships (spec/skins.md → Studies). Its other output matters as much as the look: what the run teaches about the
generators. The scaffold gives you the contracts; the look is the work.

# Parameters
- Name: <name>, lower-case kebab-case. Use the repo's own flow: `npm run new-skin -- <name> --study`, then
  `npm run new-card -- <domain> --skin <name>` for each domain you add. Do not hand-build the package, and do not copy
  Orb, Field or another study.
- Reference: the attached image is the only design input. If it is missing or too low-resolution to read a palette and
  type direction, ask me one question about the direction before editing tokens; do not invent a look. Otherwise
  decide; ask only if a choice would change the skin's identity.
- Environment: prove it can run the gates before the long work. Run `corepack enable npm` first (the repo refuses any
  npm but its pin), then `npm install`, then `npx playwright install --with-deps chromium` (or set `DASHHAUS_CHROMIUM`
  to an existing Chromium), and launch Chromium once. If the browser cannot launch, do the code work and report the
  visual check as unrun.

# Bar
- Restyle, don't leave the neutral shell: tokens, type, part shapes and page carry the reference.
  `src/skins/<name>/design.md` stays true to what you built, and its README's "How it was made" says what you did
  after the generators.
- Its Storybook section, Studies/<Name>, opens on Read me first and has the groups every skin has (Cards,
  Dashboards, Foundations, Connected); every story renders.
- `npm run check`, `npm run test-storybook` and `npm run build:ha` pass.
- Colour only from the skin's tokens; the skin's rules test passes as written. If a rule genuinely must change, change
  it deliberately and say why, never to silence a failure.
- It stays a study: no edits outside `src/skins/<name>/` except the registrations the generators make themselves.
  The Lovelace bundle, the deploy config, `spec/`, AGENTS.md and the docs pages stay untouched
  (`verify/studies.test.ts` holds this).

# Standard
spec/skins.md → Running a study, and the rules every skin keeps in spec/skins.md, are binding, as are the generated
skin's own contracts. Design lens: the roles in .agents/design/. After it draws, run Impeccable's critique and polish
on the skin's key stories.

# Finish line
Hand back in this thread:
1. TL;DR: the name, the direction (palette, type, part shapes), and what in the reference drove each.
2. The three gates, green, with the commands and their last lines.
3. Full-page PNGs from the static Storybook: Dashboards → Examples → Phone at 390 wide, Dashboards → Examples →
   Tablet at 1280 wide, Foundations → Parts at 1280 wide (story ids in storybook-static/index.json). Save them under
   `src/skins/<name>/captures/`, link them from its README, open each PNG, and say what you see and what you would
   change.
4. FRICTION: every doc path that pointed nowhere, generator step that failed or needed a hand-edit afterwards, guess you
   had to make, or place the sandbox blocked you. This is the run's main finding: report it, don't work around it.

If a gate or the screenshots could not run, name it and why; do not substitute a green check for an image.
Commit to a branch of its own; don't open a PR.

# Scope
Out: changes to the generators or their templates (report the friction instead, so the run tests them as they are);
new Home Assistant domains and hooks; changes to packages/core, packages/dashboard, Orb, Field or other studies; a
real Home Assistant; docs-site pages (the Studies page lists the study by itself); a second skin.
```
