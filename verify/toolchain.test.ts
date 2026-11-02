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

  it("is what CI enables with Corepack before npm ci", () => {
    const workflows = [read(".github/workflows/ci.yml"), read(".github/workflows/docs.yml")];
    for (const workflow of workflows) {
      const enables = workflow.match(/corepack enable npm/g)?.length ?? 0;
      expect(enables).toBe(workflow.match(/run: npm ci/g)?.length ?? 0);
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
