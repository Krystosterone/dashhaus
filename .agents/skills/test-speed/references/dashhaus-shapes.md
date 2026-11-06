# Dashhaus gate speedup shapes

The installed code shapes behind the numbers in
`dashhaus-evidence.md` (this directory). Paths are relative to the
dashhaus repository at `f746da6` (PR #20); Node-run scripts are `.js` under
`"type": "module"` (they were `.mjs` at `8eabbc1`). Copy the shape, not the
constants; re-measure in the target repository.

## Storybook: finish long finite animations

`.storybook/test-runner.ts`, inside `postVisit`, before axe and layout checks:

```ts
await page.evaluate(() => {
  for (const animation of document.getAnimations()) {
    const timing = animation.effect?.getComputedTiming();
    if (!timing || timing.iterations === Infinity || timing.activeDuration <= 1_000) continue;
    animation.finish();
  }
  return Promise.all(
    document.getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
      .map((a) => a.finished.catch(() => undefined)),
  );
});
```

Why it works: the animation ends at its final state (the alarm's base style),
so contrast is measured on the visible settled state; infinite animations are
left out because they never finish. The threshold matters: entrance animations
shorter than 1s still settle naturally.

## Storybook: inject axe once per page, collect violations only

Same `postVisit`, after the layout checks:

```ts
// The runner renders every story of a file in the same page, so axe is injected once per page;
// a reloaded page has lost it and gets it again.
if (!(await page.evaluate(() => "axe" in window))) await injectAxe(page);
const results = await getAxeResults(page, "#storybook-root", {
  runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  // Only violations fail a story; axe skips gathering every passing and inapplicable node.
  resultTypes: ["violations"],
  rules: { ...(parameters.a11y?.config?.rules ?? {}), "label-content-name-mismatch": { enabled: false } },
});
```

`axe-playwright`'s `injectAxe` reads `axe.min.js` from disk and evaluates it on
every call. `resultTypes` only trims passes, incomplete and inapplicable;
violations keep every node. Prove it with a probe story that must fail.

## Storybook: test-mode build for the test lane

`package.json`:

```json
"test-storybook": "storybook build --test --quiet && node scripts/test-storybook.js"
```

`--test` drops docs (MDX) entries and docs addons; the runner never visits them.
Only safe when a required check still compiles the MDX pages.

## Vitest projects by environment

`config/vitest.projects.ts`:

```ts
const project = (name: string, include: string[], environment: "jsdom" | "node" = "jsdom", test: Record<string, unknown> = {}) => ({
  resolve: { conditions: ["source"] },
  test: { name, include, environment, globals: true, pool: "vmForks", ...test },
});

export const projects = [
  project("root", ["src/**/*.test.{ts,tsx}", "verify/tokens.test.ts", "docs/examples/**/*.test.{ts,tsx}"]),
  project("checks", ["verify/**/*.test.{ts,tsx}"], "node", { exclude: ["verify/tokens.test.ts"] }),
  project("generators", ["scripts/*/*.test.ts"], "node", { pool: "forks" }),
  project("core", ["packages/core/src/**/*.test.{ts,tsx}"]),
  project("dashboard", ["packages/core/src/lovelace/**/*.test.{ts,tsx}"]),
  project("deploy", ["packages/deploy/src/**/*.test.ts"], "node"),
  project("fake-home-assistant", ["packages/fake-home-assistant/src/**/*.test.ts"], "node"),
];
```

Plain data so the config and `verify/projects.test.ts` can share it without
loading Vite; that test pins each project's environment and pool. `tokens.test.ts`
stays in the root (jsdom) project because the custom-element entry throws on
`HTMLElement` in Node.

`vmForks` keeps per-file isolation (a VM context with its own module graph and
globals) but loads the worker, and jsdom, once. The generators stay on `forks`
because they spawn the repo's tools; `--no-isolate` was rejected because mocks
leak between files.

## Parallel typecheck with per-program incremental state

`scripts/typecheck.js`:

```js
import { spawn } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");
const programs = [
  ["--noEmit", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/root.tsbuildinfo"],
  ["--noEmit", "-p", "packages/core/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/core.tsbuildinfo"],
  ["--noEmit", "-p", "packages/dashboard/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/dashboard.tsbuildinfo"],
  ["--noEmit", "-p", "packages/deploy/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/deploy.tsbuildinfo"],
  ["--noEmit", "-p", "src/skins/orb/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/orb.tsbuildinfo"],
  ["--noEmit", "-p", "src/skins/field/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/field.tsbuildinfo"],
];

const results = await Promise.all(programs.map((args) => new Promise((resolve) => {
  const child = spawn(process.execPath, [tsc, ...args], { cwd: root });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.on("error", (error) => resolve({ command: `tsc ${args.join(" ")}`, status: 1, output: String(error) }));
  child.on("close", (status) => resolve({ command: `tsc ${args.join(" ")}`, status, output }));
})));
```

Each program writes its own cache; a failed program prints its command and
output before the script exits non-zero. The six programs read the same files
but produce no shared output, so parallel execution is safe. The root script
resolves the compiler through `node_modules/typescript/bin/tsc`; inside a copy,
`typecheckCopy` uses `npx tsc` so the copy's linked `node_modules/.bin` decides
the binary. Copy the resolution rule that matches where the command runs.

## Generator copies without an install

`scripts/repo-copy.ts`:

```ts
export const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("VITEST") && key !== "NODE_OPTIONS"));

const skip = ["node_modules", ".git", "dist", "storybook-static", ".agents", ".claude", "research"];

export const copyRepo = (prefix: string) => {
  const copy = mkdtempSync(join(tmpdir(), prefix));
  cpSync(root, copy, { recursive: true, filter: (source) => !skip.includes(relative(root, source).split("/")[0]) });
  return copy;
};

export const run = (cwd: string, command: string, args: string[]) =>
  new Promise<{ status: number | null; output: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env });
    let output = "";
    child.stdout?.on("data", (chunk) => { output += chunk; });
    child.stderr?.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, output }));
  });

export const linkNodeModules = (copy: string) => {
  const modules = join(copy, "node_modules");
  mkdirSync(modules);
  for (const entry of readdirSync(join(root, "node_modules"))) {
    if (entry === "@dashhaus" || entry === ".cache") continue;
    symlinkSync(join(root, "node_modules", entry), join(modules, entry));
  }
  // The copy's own tool cache, seeded from the repo's typecheck state: a linked .cache would let every copy write
  // its tsbuildinfo into the repo's cache, and over each other's when suites run side by side.
  const tsc = join(root, "node_modules", ".cache", "tsc");
  if (existsSync(tsc)) cpSync(tsc, join(modules, ".cache", "tsc"), { recursive: true });
  mkdirSync(join(modules, "@dashhaus"));
  for (const scope of readdirSync(join(copy, "packages"))) symlinkSync(join(copy, "packages", scope), join(modules, "@dashhaus", scope), "dir");
  for (const skin of readdirSync(join(copy, "src/skins"))) {
    if (existsSync(join(copy, "src/skins", skin, "package.json"))) symlinkSync(join(copy, "src/skins", skin), join(modules, "@dashhaus", skin), "dir");
  }
};

export const recordWorkspace = (cwd: string) => run(cwd, "npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline"]);
```

`run` uses async `spawn`, not `spawnSync`: a long blocking call holds Vitest's
event loop and the parent times out `onTaskUpdate`.

`typecheckCopy` runs only the root and core programs, sequentially, because the
copy is a serial chain. The dashboard and deploy copies are byte-identical to
the repository's, so the parent gate's typecheck covers them.

```ts
export const typecheckCopy = async (cwd: string) => {
  for (const args of [
    ["--noEmit", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/root.tsbuildinfo"],
    ["--noEmit", "-p", "packages/core/tsconfig.json", "--incremental", "--tsBuildInfoFile", "node_modules/.cache/tsc/core.tsbuildinfo"],
  ]) {
    const result = await run(cwd, "npx", ["tsc", ...args]);
    if (result.status) return result;
  }
  return { status: 0, output: "" };
};
```

## Generator tests: one copy, one workspace proof

`scripts/new-skin/index.test.ts` and `scripts/new-skin/field.test.ts`:

```ts
import { copyRepo, linkNodeModules, recordWorkspace, root, run, typecheckCopy } from "../repo-copy";

copy = copyRepo("new-skin-canvas-");
const skin = await run(copy, "node", ["scripts/new-skin/index.js", "canvas"]);
const card = await run(copy, "node", ["scripts/new-card/index.js", "light", "--skin", "canvas"]);
linkNodeModules(copy);
const workspace = await recordWorkspace(copy);
// ... typecheckCopy(copy), lint, targeted vitest, build:ha
```

`recordWorkspace` is the only install: `--package-lock-only` reads every
workspace manifest and records the generated skin's link without reinstalling
the tree that `linkNodeModules` already shares.

## Storybook server and shard pass-through

`scripts/test-storybook.js` serves `storybook-static/` on port 6006 and spawns
the test-runner with `--config-dir .storybook --url http://127.0.0.1:6006`
followed by the caller's arguments. CI passes `--shard=N/2 --maxWorkers=2`, so
the same local command is the sharded CI command.

## Local gate: one after another

`npm run check` stays `npm run typecheck && npm run lint && npm run test`. Running the
three side by side was tried twice and lost both times on the 8-core Mac (see the
evidence's Rejected tables): warm, typecheck takes about 3s and lint about 1s, so
the tests are nearly the whole gate and the other two only take cores from them.

## CI: one setup action

`.github/actions/setup/action.yml` (composite), used by every job in `ci.yml` and
`docs.yml` right after `actions/checkout`, and by `release.yml`'s build with `cache: "false"`:
that build restores neither install cache, so the shipped `dashhaus.js` never comes from an
entry another job saved. Its uncached `npm ci` is deliberate; don't speed it up.

```yaml
inputs:
  tool-cache: { default: "false" }   # "true" restore + save, "restore" read-only
  chromium:   { default: "false" }
  cache:      { default: "true" }    # "false" skips both install caches below (the release build)
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with: { node-version-file: .nvmrc }          # no `cache: npm`: it runs the bundled npm, which devEngines refuses
    - run: corepack enable npm && npm --version
      shell: bash
    - id: modules
      if: inputs.cache != 'false'
      uses: actions/cache@v4
      with:
        path: |
          node_modules
          !node_modules/.cache
        key: modules-${{ runner.os }}-${{ hashFiles('.nvmrc', 'package-lock.json', 'package.json', 'packages/*/package.json', 'src/skins/*/package.json', 'docs/package.json') }}
    - if: inputs.cache != 'false' && steps.modules.outputs.cache-hit != 'true'
      uses: actions/cache@v4
      with: { path: ~/.npm, key: "npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}", restore-keys: "npm-${{ runner.os }}-" }
    - if: steps.modules.outputs.cache-hit != 'true'
      run: npm ci --no-audit --no-fund
      shell: bash
    - if: inputs.tool-cache == 'true'          # saved after a green job; `restore` uses actions/cache/restore@v4
      uses: actions/cache@v4
      with:
        path: node_modules/.cache
        key: tools-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ github.sha }}
        restore-keys: |
          tools-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-
          tools-${{ runner.os }}-
    # chromium: read the Playwright version, cache ~/.cache/ms-playwright per version,
    # and on a miss: npx playwright install --only-shell chromium   (no --with-deps)
```

`node_modules` is cached without `.cache` because `actions/cache` saves only on a
key miss; the tool caches change every commit and need their own key. ESLint runs
with `--cache --cache-strategy content` so a fresh checkout doesn't invalidate it.
`verify/toolchain.test.ts` holds the action to setup-node then Corepack then one
`npm ci`, and every workflow to install only through it.

## CI lanes

Jobs in `.github/workflows/ci.yml` at `f746da6`:

| Job | Work |
|---|---|
| `checks` | setup with `tool-cache: "true"`; `typecheck`, `lint`, `build:ha` |
| `unit` | `test:unit -- --maxWorkers=2` |
| `generators (new-skin)` / `generators (new-card, field)` | matrix `files:`; setup with `tool-cache: restore`; `vitest run --maxWorkers=2 <files>` |
| `dx` | setup with `chromium`; `release:pack`, `verify:packages`, the two journeys |
| `storybook (1/2)` / `(2/2)` | setup with `chromium`; `test-storybook -- --shard=N/2 --maxWorkers=2` |
| `check` | required aggregate over checks, unit, generator shards, dx |
| `storybook` | required aggregate over both shards |

Workflow-level `concurrency: { group: ci-${{ github.event_name }}-${{ github.ref }}, cancel-in-progress: ${{ github.ref != 'refs/heads/main' }} }`.
`verify/projects.test.ts` fails when a `scripts/*/*.test.ts` suite is in no
matrix `files:` entry, or in two. No path filters.

Cache keys are branch-scoped: a new branch or a merge run misses them and pays
`npm ci`. A change to any manifest in the `node_modules` key makes the next run
cold too. Compare CI timings only at the same cache state.
