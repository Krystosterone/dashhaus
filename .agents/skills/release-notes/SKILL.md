---
name: release-notes
description: Write the change note a pull request carries, and finish a release PR's record. Use when a change touches what a release ships (a public package, a skin's resource entry, the lockfile or the build), when CI says a pull request "adds no change note" or a candidate is unfinished, when preparing a release with npm run release, or when reviewing notes or a release record.
---

# Release notes

A release's notes are written one pull request at a time, while each change is fresh, and collected when it ships.
The mechanics are spec/release.md → Change notes and Releasing; this skill is how to write them well. Everything here
lands in a diff a person reviews: draft freely, but never mark something as done that wasn't.

## While working on a pull request

Write the note when the change is complete, in the same pull request, and keep it true if review changes the scope:

```sh
npm run change -- fix "Orb's lock card asks for the code again after a wrong one, instead of locking."
```

Pick the type by what someone who installed Dashhaus has to do about it:

| Type | When | Examples |
| --- | --- | --- |
| `breaking` | They must change something to keep working | a removed or renamed export, a changed hook signature or option, a renamed YAML key, a higher Node or React floor, a `dashboard.config.mjs` change |
| `feature` | Something new they can use | a new card, a new YAML key, a new hook, a new deploy flag |
| `fix` | Something that was wrong now works | a card that drew the wrong state, a deploy that failed, a type that was wrong |
| `internal` | Nothing they would notice | a refactor, a test, CI, the build, a spec-only edit inside a package folder |

When unsure between `internal` and anything else, ask whether a person reading only this note would want to know.
When unsure whether it breaks, it does: the API comparison will flag it anyway, and a person decides.

Write for someone deciding whether to upgrade, who has never seen the code:

- Lead with what they notice, then, for `breaking`, what to do: "Rename `entities:` to `cards:` in your YAML."
- Name the thing in the repository's words (AGENTS.md → Vocabulary): the card, the skin, the package, the YAML key.
  Never "widget", never a file path or function they can't see, unless it is the API they import.
- One or two sentences. No "this PR", no implementation, no ticket numbers.
- One note per thing a consumer would notice; most pull requests have one. Don't rewrite another pull request's note.

Good: `Field's climate module shows the target range on its screen while heating or cooling.`
Not: `Refactored ClimateModule to use RangeFader and fixed the screen logic.` (implementation; says nothing they see)

## Preparing a release PR

1. `npm run release -- --dry-run` shows the notes, the API comparison and the suggested version. Take the suggestion
   unless the person asks for another; a lower one than suggested needs their say.
2. `npm run release [-- <x.y.z>]` on a branch, commit everything, open the pull request.
3. Finish every `TODO:` in `spec/releases/<version>.md`:
   - **Release page**: two or three lines for the GitHub release, for a Marketplace user. Lead with the change most of
     them would notice; mention breaking changes first if there are any. It is a pitch, not the list.
   - **API changes without a breaking note**: read `npm run release:api`'s before and after for each changed export.
     If consumer code compiled against the old declaration can fail, it breaks: add a bullet under Breaking changes
     (create the section) saying what to do, and expect the version to move. If not (a widened type, an added optional
     field), replace the TODO with one sentence saying why.
   - **Live Home Assistant smoke**: only a person with a Home Assistant can run it (spec/release.md → Live Home
     Assistant smoke). Never write a result you didn't observe. If the person says to skip it, write `Unrun:` and
     their reason.
4. CI's `dx` lane then checks the record and the digests. If it says a note "arrived after" the record, move that
   note's text into What changed and delete the file. If it says the files differ, main moved: run
   `npm run release:digests` and commit.

Never edit a `.sha256` by hand, set a version by editing manifests, or publish by hand: the Release workflow ships what
the merged pull request recorded, and nothing else.
