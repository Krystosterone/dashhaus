/**
 * The toolchain fails loudly when it drifts (AGENTS.md → Commands): the wrong npm stops before it rewrites the lockfile
 * and says to run `corepack enable`, and one variable points every browser-driven command at an existing Chromium.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { atLeast, npmProblem, pinnedNpm, runningNpm } from "../scripts/check-npm.js";
import { CHROMIUM_ENV, chromiumExecutable, chromiumLaunchOptions } from "../scripts/chromium.js";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const manifest = JSON.parse(read("package.json"));

describe("the pinned npm", () => {
  it("is the floor devEngines holds every npm command to, and the preinstall checks", () => {
    const pinned = pinnedNpm(manifest.packageManager);
    expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);
    // npm 10.9 and later stop on devEngines before they read or write the lockfile; corepack reads packageManager.
    expect(manifest.devEngines).toEqual({ packageManager: { name: "npm", version: `>=${pinned}`, onFail: "error" } });
    // An older npm ignores devEngines; the preinstall then fails with the fix.
    expect(manifest.scripts.preinstall).toBe("node scripts/check-npm.js");
    // No engine-strict: it would hold every dependency's engines to the running Node too.
    expect(() => read(".npmrc")).toThrow();
  });

  it("refuses an older npm, saying to enable corepack and restore the lockfile", () => {
    const problem = npmProblem("npm/10.8.3 node/v22.22.0 linux x64 workspaces/false", "npm@11.18.0");
    expect(problem).toContain("npm 10.8.3 is running, but package.json pins npm@11.18.0");
    expect(problem).toContain("corepack enable npm");
    expect(problem).toContain("git checkout package-lock.json");
  });

  it("accepts the pinned npm or a newer one, and anything that is not npm", () => {
    expect(npmProblem("npm/11.18.0 node/v22.22.0 darwin arm64", "npm@11.18.0")).toBeNull();
    expect(npmProblem("npm/11.19.1 node/v24.1.0 darwin arm64", "npm@11.18.0")).toBeNull();
    expect(npmProblem(undefined, "npm@11.18.0")).toBeNull();
    expect(runningNpm("pnpm/9.0.0 npm/? node/v22.0.0")).toBeUndefined();
    expect(atLeast("11.6.2", "11.18.0")).toBe(false);
    expect(atLeast("12.0.0", "11.18.0")).toBe(true);
  });

  it("is what CI enables with Corepack before anything runs npm", () => {
    // Every lane installs through the one setup action, and it enables the pinned npm straight after setting Node up:
    // nothing between the two runs Node's bundled npm. setup-node's `cache: npm` would (`npm config get cache`), and
    // devEngines refuses it.
    const setup = read(".github/actions/setup/action.yml");
    const steps = setup.split(/^\s+- /m).slice(1);
    expect(steps[0], "the setup action sets Node up first").toMatch(/uses: actions\/setup-node@/);
    expect(steps[1], "and enables the pinned npm next").toMatch(/run: corepack enable npm/);
    expect(setup.match(/uses: actions\/setup-node@/g)?.length).toBe(1);
    expect(setup, "setup-node's npm cache runs the bundled npm before Corepack").not.toMatch(/^\s+cache: npm\s*$/m);
    expect(setup.match(/run: npm ci\b/g)?.length, "one install, after Corepack").toBe(1);

    for (const path of [".github/workflows/ci.yml", ".github/workflows/docs.yml"]) {
      const workflow = read(path);
      expect(workflow.match(/uses: \.\/\.github\/actions\/setup$/gm)?.length ?? 0, `${path} installs through the setup action`).toBeGreaterThan(0);
      expect(workflow, `${path} sets Node up only through the setup action`).not.toMatch(/uses: actions\/setup-node@/);
      expect(workflow, `${path} installs only through the setup action`).not.toMatch(/run: npm (?:ci|install)\b/);
    }
  });
});

describe(CHROMIUM_ENV, () => {
  it("leaves Playwright's own build in place when unset or empty", () => {
    expect(chromiumExecutable({})).toBeUndefined();
    expect(chromiumExecutable({ [CHROMIUM_ENV]: "  " })).toBeUndefined();
    expect(chromiumLaunchOptions({ headless: true }, {})).toEqual({ headless: true });
  });

  it("launches the executable it names, and refuses a path that doesn't exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "dashhaus-chromium-"));
    try {
      const chrome = join(dir, "chrome");
      writeFileSync(chrome, "");
      expect(chromiumLaunchOptions({ headless: false }, { [CHROMIUM_ENV]: chrome })).toEqual({ headless: false, executablePath: chrome });
      expect(() => chromiumExecutable({ [CHROMIUM_ENV]: join(dir, "missing") })).toThrow(`${CHROMIUM_ENV}=`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is read by every browser-driven command", () => {
    expect(read(".storybook/test-runner-jest.config.js")).toContain("chromiumLaunchOptions(");
    expect(read("scripts/perf/collect.js")).toContain("chromium.launch(chromiumLaunchOptions(");
    expect(read("docs/scripts/screenshots.js")).toContain("chromium.launch(chromiumLaunchOptions(");
    const harness = read("verify/dx/harness.js");
    expect(harness.match(/chromium\.launch\(/g)?.length).toBe(harness.match(/chromium\.launch\(chromiumLaunchOptions\(/g)?.length);
  });
});
