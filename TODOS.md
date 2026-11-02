# TODOS

- [x] Add a details surface to the author scaffold. The generated light and sensor cards extend `CardProps`, draw on `@dashhaus/dashboard/card`'s frame (`useCardFrame`, `CardDialog`) and open and close a sheet through `detailsTile`; the author DX journey opens and closes both in a skin scaffolded from packed tarballs. Rerun the live smoke and record observation 6 in `spec/releases/0.2.0.md`.
- [x] Prove a third-party kind's `options` escape hatch from a packed install before 1.0. `verify/conformance-package.test.ts` installs the release tarballs into a temporary app, asserts `@dashhaus/dashboard/schema` resolves to the installed `dist`, defines a kind with its own `id`, `keys` and `options` over `readColor`, checks `cardKinds` dispatches to it and `readCard` merges the option into the card, and checks a bad value is exactly one problem at the card's path naming its key. The scaffolder already reads through `readCard`.
- [ ] Make the first npm release of `0.2.0`: claim the `@dashhaus` scope, publish the seven tarballs in dependency order (`core`, `dashboard`, `deploy`, `orb`, `field`, `bundle`, `create-dashhaus-skin`), then tag and create the GitHub release. Blocked by the protection 403 and the live-smoke rerun; history and CI are clean. The release notes are `spec/releases/0.2.0.md`.
- [ ] Build the in-Home-Assistant setup card so a Marketplace install creates its dashboards without `dashhaus-deploy`. It is a bundle-only plain custom element in `src/setup.tsx`, registered by `apps/lovelace/entry.ts`, using `hass.connection.sendMessagePromise` for `lovelace/dashboards/list`, `dashboards/create`, `config/save` and, for rollback, `dashboards/delete`: admin-only, storage-mode only, create-only, idempotent, one checkbox per dashboard, never overwrite. Test the reconciler with a fake connection in `src/setup.test.tsx`, add `dashboards/delete` to `verify/dx/fake-ha.js` and a dx/browser journey, and prove a live Marketplace install before calling it done. Reaching users still needs the gates in `research/11-in-ha-setup-card.md`: public repo, OSI license, `hacs.json`, a release carrying `dashhaus.js`, the HACS action and the catalog PR.
- [ ] Publish Dashhaus to the Marketplace and HACS from one release. Choose and add an OSI license (MIT or Apache-2.0), make the repository public, add a root `hacs.json` with `name` (no `filename`: the repository is `dashhaus` and the asset is `dashhaus.js`), attach `dist/dashhaus.js` to a full GitHub release, add `hacs/action` with `category: plugin` and no ignored checks, and fill the repository description, topics and issues; the README install block and screenshot are in the agent-surface item. Gate: a live Marketplace install on 2026.11 and a pre-2026.11 HACS install from the `hacs_repository` link, and a green HACS action. See `research/12-web-agent-onboarding.md`.
- [ ] Add the agent-first install surface. Put `docs/src/content/docs/start/install.mdx` first under **Start here**: the version branch (2026.11+ Marketplace, older HACS), the My link `https://my.home-assistant.io/redirect/hacs_repository/?owner=Krystosterone&repository=dashhaus&category=plugin`, install, reload, add `custom:dashhaus-setup`, press Create, and the YAML-mode fallback; include a copy-paste prompt. Rewrite the README top as install-first with a screenshot and the badge, and set `starlight-llms-txt`'s `description`/`details` to the same steps so `llms.txt` carries them. Gate: `npm run build:docs`, the generated `llms.txt`/`llms-full.txt`, and a fresh-agent dry run from the page URL alone.
- [ ] Submit to the Marketplace/HACS catalog after the gates: PR to `hacs/default`'s `plugin` list, alphabetical, with the release and a green HACS action; the Marketplace and HACS read the same catalog and review takes months. The My link works before the merge, so this is discovery, not launch. See `research/12-web-agent-onboarding.md`.
- [ ] Enable GitHub Pages with source **GitHub Actions** in the repository settings before the repository goes public, so the Docs workflow's first public run can deploy. `.github/workflows/docs.yml` deploys only when `github.event.repository.visibility == 'public'`: until then the `deploy` job and its pages artifact upload skip themselves and the run stays green, so nothing will remind us, and a private repository without a paid plan cannot serve Pages at all.
- [x] Build the `fan` card, the first gap ranked in `research/10-entity-domain-coverage.md`. It is a direct control — on/off, percentage, preset modes, oscillation and direction — with five capability-gated `fan.*` services, today's on-minutes from `onOffHistoryFromHass`, and no new primitive; speed takes the light card's groove in both skins. Scaffold it with `npm run new-card -- fan --code fn --domain fan`, then draw the speed control where the generated toggle-only card has its pill. Take `lock` second, `binary_sensor` third and `calendar` fourth as the note ranks them.
- [x] Build the `lock` card, the second gap ranked in `research/10-entity-domain-coverage.md`, in orb (`LockCard`, `LockTile`, `HaLockTile`) and field (`LockModule`, `HaLockModule`) on one `useHaLock`: a composed control, `lock.*` with its device's battery, `lock`, `unlock` and a gated `open` through `serviceRunner`, a tap that locks and an unlock that always asks first (the question, or the keypad when the lock wants a code), and the last change instead of history. The same-device battery lookup is `deviceCompanion` in `@dashhaus/dashboard/layout` and its reading `mappers/battery.ts`, for `binary_sensor` to reuse. `lock` is left out of the scaffolder's `domains.json`: it has no `LockHistory`, so a generated skin can't `add lock` yet.
- [ ] Make every card composition, as `research/mechanism-backlog.md` → 2 lists: move what each skin re-implements per card into `@dashhaus/core` primitives and each skin's `shared/` parts, and redraw the cards on them. Start with the guarded-action rows before the next card with a deliberate action: a `useGuardedAction` primitive, a Keypad and a Confirm part in both skins, and a details surface that opens on an action, with the alarm and the lock redrawn on them (the lock's production code should drop by about 250 lines). Then field's key group and facts, then the rest of the table. Add a `verify/` check that flags a component or class block defined in two card folders of a skin. Fix the generators, which feed the copying:
  - move the templates onto the new parts and formatters, and each domain's seeds into `@dashhaus/core/demo`;
  - have each domain declare its actions' kinds (plain, guarded, takes a code) beside its handlers, so the scaffolder and `new-card --skin` draw a guarded action through `Confirm`/`Keypad` or leave it out, never as one tap;
  - make History optional and let the field generator draw controls beyond `onToggle`, so `new-card -- lock --skin field` and the scaffolder's `add lock` work.
  Each row is its own change, done when its cards' tests and stories pass unchanged in both skins.

## Clean-slate YAML layout

Research: [13 Clean-slate YAML layout system](research/13-yaml-layout-system.md).
Next session: [goal brief](research/13-yaml-layout-system-brief.md).
The operator allows a breaking YAML replacement and recreating existing cards; preserving the old grammar or names is
not a constraint. The recorded syntax is a proposal, not an approved spec. Only the design task below is ready;
implementation remains gated on design approval and explicit authorization.

- [ ] Settle the clean-slate layout contract with the operator: simple and power shapes, complete examples, types,
  defaults, exclusions, repairable errors, responsive behavior, Field treatment and remaining calls. Pressure-test the
  research proposal rather than treating `cards`/`rows`, `width`, alignment or fit thresholds as already approved.
  Preserve the design-only stop point in the goal brief.
- [ ] Specify and prove deterministic placement: anchored versus automatic cards, normal versus dense packing, repeated
  anchors, hard row boundaries, spanning-card alignment, bundle unit occupancy, width clamping and responsive anchor
  release. Resolve visual/DOM/keyboard order and Field mixed-footprint rules before shipping an algorithm.
- [ ] Implement the approved shared YAML grammar and normalization path with skin capabilities and complete
  path-bearing validation. Remove the old grammar and obsolete aliases/callers instead of adding a compatibility mode;
  YAML compatibility permission does not authorize unrelated entity or public skin-author interface changes.
- [ ] Cut Orb and Field over end to end: configured rendering, width-driven layout, fixed-footprint geometry, bundles,
  automatic dashboard producers, picker defaults, pages and navigation. Inventory other registered skins rather than
  leaving a second grammar behind.
- [ ] Make the card's configuration-error surface display every independent problem with its path and repair, including
  wrong-skin and malformed-layout cases. Document which raw-YAML syntax/source errors never reach Dashhaus; do not add a
  second editor/parser to fake that guarantee.
- [ ] Replace affected examples, stories, docs samples, deploy-produced configs, scaffold templates and consumer guidance
  with the approved grammar. Update the owning specs and checked contracts; remove obsolete examples and comments.
- [ ] Add behavioral regression coverage for the approved parser/layout invariants and exercise the real Lovelace
  surface in a browser at phone, tablet and wall widths, including narrow parent containers, mixed footprints, dense
  holes, row barriers, anchored/spanning cards, alignment, joined-bundle reflow, long names and unavailable/state changes.
  Assert stable card geometry across state changes and observe usable error cards, not just passing unit tests.
- [ ] Run the applicable gates from AGENTS.md after implementation: `npm run check`, `npm run test-storybook`,
  `npm run build:ha`, `npm run build:docs` for site/template changes, and `npm run release:check` when the package surface
  changes. Record only exercised evidence and explicit live/iOS/screen-reader limits; fold implemented decisions into
  their owning specs/docs/code and retire the completed research entry.
