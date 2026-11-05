# Change notes

One file per pull request, for the next release's notes. Write it with the command, in the pull request that makes
the change:

```sh
npm run change -- fix "Orb's lock card asks for the code again after a wrong one, instead of locking."
```

The type is `breaking` (a consumer must act), `feature` (something new to use), `fix` (something that works now), or
`internal` (nothing a consumer notices: a refactor, a test, a build change). Write the text for someone deciding
whether to upgrade, in the repository's words: card, model, skin. Say what changed for them, not how.

CI fails a pull request that changes what a release ships without a note. `npm run release` collects the notes into
`spec/releases/<version>.md`, leaving out `internal` ones, and deletes them. See spec/release.md → Change notes.
