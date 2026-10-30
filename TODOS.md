# TODOS

- [ ] Add instrumentation so agents can test the performance of dashboards in production.
- [ ] Split `AGENTS.md`, `README.md` and the skills.
- [ ] Hide ugly tooling config at the repo root inside folders (`eslint.config.js`, `tsconfig.json`, `vite*.config.ts`, `vitest.config.ts`, `test-runner-jest.config.js`, `skills-lock.json`).
- [ ] Clean up the repo so it is agent-harness agnostic: standard `.agents/` + `AGENTS.md`, no harness-specific files.
- [ ] Remove personally identifying information before publishing — current files and git history.
  - `Nova` (kid's name) is in 36 tracked files: README.md and `docs/cards.md`/`docs/deploy.md` examples, demo seeds and story exports (`novaSleepMode`), `packages/core/src/ha/fixtures/owlet.json`, field's alert copy, and real Home Assistant ids (`nursery_music`, `number.nursery_volume`, `sensor.owlet_sock_ac000w0123_sleep_state`). Replace with a neutral name and ids; keep the examples as readable.
  - Owner identity: `Krystosterone` in README's Issues link and `.storybook/blocks/MarkdownWithStories.tsx`, plus the `origin` URL; all 155 commits carry `Krystian Czesak <krystianczesak@gmail.com>`.
  - `.impeccable/critique/*.md` commit absolute `/home/operator/...` paths; they are dev artifacts, not docs — consider dropping them.
  - No street address or home-network address turned up in the current tree, and `.env` was never committed (only `.env.example`), so the Home Assistant URL and credentials are not in history.
  - Do the history rewrite while the repo is private: `git filter-repo --replace-text` (names, ids, home path) and `--mail-map` (author), then force-push. Old clones, forks and GitHub's cached commits keep copies, so ask GitHub support to purge them after.
  - Verify: `git grep -i nova` for the tree and `git log -p -i -S nova` for history on the rewritten repo.
