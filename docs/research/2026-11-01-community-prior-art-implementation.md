# Brief: implement the community prior-art patterns

## Outcome

Implement the adopted patterns in `research/09-community-prior-art-and-patterns.md` on a branch from `main`, in its
suggested order, so the headless core gains the dev checks, error metadata, registry hooks and test ergonomics the
note chose — without importing any of the routes it rejects.

## Parameters

- Read `research/09-community-prior-art-and-patterns.md` first. It is the authority for what to take, what not to
  take, each change's files and acceptance gate, and the open questions. Do not re-run the survey.
- Base: current `main` after the research cleanup (`d98466c`) and this brief. `docs/research/` holds the dated briefs;
  `research/09` is the open note.
- Work on a new branch and commit there. Pushing, opening a PR and merging wait for the operator.
- Use the repo's existing tools only: `npm run check` and `npm run test-storybook`. Do not add a test runner or linter.

## Bar

- Ship note items 1–5 and the item 6 decision, in the note's order. Item 7 stays untouched unless a named consumer
  needs it; say so rather than implementing it.
- Never adopt anything under "What not to take": no auth implementation, token storage, refresh or login UI in core;
  no automatic service retries; no raw provider messages in errors; no presentation enrichment in core; no generated
  entity/service types, locale sync or service Proxy; no second auth surface; no hand-written headless wrappers; no
  snapshot-first hook tests.
- `docs/core.md` freezes the stable vs internal core surface, error codes, transport lifecycle, host-owned auth and
  external-transport security. Link it from `packages/core/README.md`, keep `docs/contract.md`'s dashboard surface
  unchanged, and do not freeze what the note marks internal without saying so.
- Dev checks warn once, only outside production, never throw, and never warn for a missing entity by default.
- Error metadata keeps the sanitized `translation_key`/`code` scalars and the existing retry behavior; skins keep
  their own copy.
- Registry hooks read once per generation, depend only on registry data (not the entity map), and preserve the
  existing `useHaArea` behavior through the new API.
- Test helpers are additive; all-domain headless parity covers every hook that has a domain model, including option
  pass-through (`name`, `loadHistory={false}`, `onActionError`).
- React 19 is widened only after a clean consumer install, typecheck and build, with the existing React 18 suites
  still passing; otherwise record the tested result and keep the current range.

## Standard

`AGENTS.md` → Commands, Layout and Hard rules; `docs/home-assistant.md`; the `home-assistant-integration` skill;
`docs/contract.md`; `docs/performance.md` only if a change touches a marked path. Where the note and the code
disagree, the code wins; report the difference instead of forcing the note's route.

## Evidence

The note's findings, file-level table and acceptance gates are the evidence; the local code references at its end are
the starting points. The repo is clean at the base, and `npm run check` (1,198 tests) and `npm run test-storybook`
(406 tests) pass there.

## Scope

Out of scope: live Home Assistant auth, token refresh or readback; a security review (commission it before any auth
code); OAuth, token storage or a login UI; generated types, locales or a service Proxy; presentation enrichment;
automatic service retries; snapshot-first hook tests; skin or card visual changes. Do not re-run the community survey
or change the note's adopted/rejected list.

## Escalation

Decide the smallest reversible option where the note leaves the shape open (the registry hook's exact API, whether
React 19 passes), and report the decision. Ask once, with options, only if a step needs a security review, breaks
`docs/contract.md`, or would add a public package dependency.

## Finish line

- Items 1–5 implemented, item 6 decided on its consumer test, item 7 explicitly left; each change meets the note's
  own acceptance gate.
- `npm run check` and `npm run test-storybook` pass at the final revision.
- Hand back a table of note item → files → test/gate, the React 19 evidence (or why it could not run), any place the
  code contradicted the note, and the exact gate output.
