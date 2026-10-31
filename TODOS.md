# TODOS

- [ ] Add instrumentation so agents can test the performance of dashboards in production.
- [ ] Split `AGENTS.md`, `README.md` and the skills.
- [ ] Remove personally identifying information before publishing, from the tree and from history.
  - `Nova` is in 37 tracked files: README and `docs/` examples, demo seeds and story exports (`novaSleepMode`), `packages/core/src/ha/fixtures/owlet.json`, field's alert copy and real Home Assistant ids (`nursery_music`, `number.nursery_volume`, `sensor.owlet_sock_ac000w0123_sleep_state`). Replace with a neutral name and ids; keep the examples readable.
  - Owner identity: `Krystosterone` in README's Issues link, `.storybook/blocks/MarkdownWithStories.tsx` and `origin`; every commit is `Krystian Czesak <krystianczesak@gmail.com>`.
  - `.impeccable/critique/*.md` carries absolute `/home/operator/…` paths; deleting the folder removes them from HEAD but not from history.
  - While private: rewrite history with `git filter-repo --replace-text` (names, ids, home path) and `--mail-map` (author), force-push, then ask GitHub support to purge cached commits. Verify `git grep -i nova` and `git log -p -i -S nova` come back empty. Keep the repo private until this is done.
- [ ] Make `main` require the `check` and `storybook` status checks. The protection API answers 403 on the private repo, so this needs GitHub Pro (Settings → Branches, or `PUT /branches/main/protection` with `required_status_checks.contexts: ["check","storybook"]`), or making the repo public, which the PII item blocks. Verify by reading the protection back.
- [ ] Finish the package split before 1.0: `@dashhaus/dashboard/card` and `./schema` are the frozen contract (`docs/contract.md`) and `./conformance` ships, but nothing yet proves a third-party kind's `options` escape hatch from a packed install.
- [ ] Decide the split's remaining packaging questions: do orb and field ever ship as installable packages, and do `new-card`/`new-skin` ever ship as a private tools package?
- [ ] Make the first npm release: claim the `@dashhaus` scope, publish `release/dashhaus-{core,dashboard,deploy}-0.1.0.tgz` in dependency order, then tag and create the GitHub release. Start after the PII rewrite and a green `main`.
