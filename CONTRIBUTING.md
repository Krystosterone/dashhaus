# Contributing

Thanks for wanting to help. Dashhaus is a small project with strong opinions about how it looks and behaves, so the
order is: talk first, then code.

1. **Open an issue first** for anything beyond a typo: a bug, a new card, a change to a skin's look. Agree the change
   there; a pull request nobody asked for may be declined however good it is.
2. **Read how the repository works.** The [Contribute](https://krystosterone.github.io/dashhaus/develop/monorepo/)
   section of the docs is the guide for people. `AGENTS.md` is the full set of rules (vocabulary, layout, boundaries,
   generators, the Storybook tree), written for coding agents and maintainers alike, and `spec/` holds each skin's
   design rules and each card's behaviour.
3. **Set up** with Node 22.23.4 (`.nvmrc`, `nvm install`) and npm 11.18 (`corepack enable npm`), then `npm install`. Another npm version
   rewrites `package-lock.json`, so the install refuses to run with one.
4. **Start from the generators** when adding a card or a skin (`npm run new-card`, `npm run new-skin`) rather than
   copying the nearest one.
5. **Before you open the pull request**, run `npm run check` and `npm run test-storybook`, and look at the affected
   card's stories at every width and footprint. Document a change in behaviour in the spec, and in the docs when a
   person deploying or choosing a skin would notice it.

By contributing you agree your work is released under the repository's [MIT license](LICENSE), and to follow the
[code of conduct](CODE_OF_CONDUCT.md).
