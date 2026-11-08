/**
 * The toolchain fails loudly when it drifts (AGENTS.md → Commands): the wrong npm stops before it rewrites the lockfile
 * and says to run `corepack enable`, and one variable points every browser-driven command at an existing Chromium.
 */
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
    // nothing between the two runs Node's bundled npm. setup-node's `cache: npm` would (`npm config get cache`), and so
    // would the npm cache it enables on its own when package.json names a packageManager; devEngines refuses both.
    const setup = read(".github/actions/setup/action.yml");
    const steps = setup.split(/^\s+- /m).slice(1);
    expect(steps[0], "the setup action sets Node up first").toMatch(/uses: actions\/setup-node@/);
    expect(steps[1], "and enables the pinned npm next").toMatch(/run: corepack enable npm/);
    expect(setup.match(/uses: actions\/setup-node@/g)?.length).toBe(1);
    expect(setup, "setup-node's npm cache runs the bundled npm before Corepack").not.toMatch(/^\s+cache: npm\s*$/m);
    expect(steps[0], "setup-node turns its npm cache on by itself for a packageManager, unless told not to").toMatch(
      /^\s+package-manager-cache: false\s*$/m,
    );
    expect(setup.match(/run: npm ci\b/g)?.length, "one install, after Corepack").toBe(1);

    for (const path of [".github/workflows/ci.yml", ".github/workflows/docs.yml", ".github/workflows/release.yml"]) {
      const workflow = read(path);
      expect(workflow.match(/uses: \.\/\.github\/actions\/setup$/gm)?.length ?? 0, `${path} installs through the setup action`).toBeGreaterThan(0);
      expect(workflow, `${path} sets Node up only through the setup action`).not.toMatch(/uses: actions\/setup-node@/);
      expect(workflow, `${path} installs only through the setup action`).not.toMatch(/run: npm (?:ci|install)\b/);
    }
  });

  it("builds the release from the lockfile, restoring no cache", () => {
    // Any job on main can save an Actions cache entry a later run restores; the shipped tarballs must not come from one.
    const release = read(".github/workflows/release.yml");
    expect(release, "the release build passes cache: \"false\" to the setup action").toMatch(
      /uses: \.\/\.github\/actions\/setup\n\s+with:\n\s+cache: "false"/,
    );
    const steps = read(".github/actions/setup/action.yml").split(/^\s+- /m).slice(1);
    const restores = steps.filter((step) => /^name: Restore (?:node_modules|npm's downloads)/.test(step));
    expect(restores).toHaveLength(2);
    for (const step of restores) expect(step, "each install cache is skipped when cache is false").toMatch(/if: inputs\.cache != 'false'/);
  });

  it("ships a release from main on its own, publishing to npm with no token and running no repository script after the build", () => {
    // spec/release.md → Releasing: merging the release PR is the trigger; trusted publishing is the only credential.
    const release = read(".github/workflows/release.yml");
    const jobs = Object.fromEntries(
      release.split(/^jobs:\n/m)[1].split(/^(?= {2}\S)/m).filter((block) => /^ {2}[\w-]+:/.test(block)).map((block) => [/^ {2}([\w-]+):/.exec(block)![1], block]),
    );
    expect(Object.keys(jobs), "least reversible last").toEqual(["plan", "build", "draft", "publish", "registry", "release", "listings"]);
    expect(release, "a version bump or refreshed digests on main, or a rerun by hand").toMatch(
      /^on:\n {2}push:\n {4}branches: \[main\]\n {4}paths: \[packages\/core\/package\.json, "spec\/releases\/\*\.sha256"\]\n {2}workflow_dispatch:\n\n/m,
    );
    expect(jobs.plan, "a dispatch ships only from main").toContain('if [ "$GITHUB_REF" != refs/heads/main ]');
    expect(release, "no npm token anywhere").not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/);
    // One secret, in one job: the token that starts the skin repositories' mirrors (spec/release.md → The skin repositories).
    expect([...release.matchAll(/secrets\.(\w+)/g)].map((match) => match[1]), "no other secret").toEqual(["SKIN_REPOSITORIES_TOKEN"]);
    expect(jobs.listings, "only the listings job holds it").toContain("secrets.SKIN_REPOSITORIES_TOKEN");
    expect(jobs.listings, "it can't write here").toMatch(/^ {4}permissions: \{\}$/m);
    expect(jobs.listings, "it starts each mirror with this version").toContain('gh workflow run release.yml -R "$OWNER/$repository" -f version="$VERSION"');
    expect(release, "no inputs: the commit decides everything").not.toMatch(/inputs\./);
    for (const [name, job] of Object.entries(jobs)) {
      expect(job.includes("id-token: write"), `${name} ${name === "publish" ? "is" : "is not"} the job npm trusts`).toBe(name === "publish");
      expect(job.includes("contents: write"), `${name} ${["draft", "release"].includes(name) ? "may" : "may not"} write the release`).toBe(["draft", "release"].includes(name));
      // Only the read-only build and registry jobs install and run the repository's code.
      if (["draft", "publish", "release", "listings"].includes(name)) expect(job, `${name} runs no repository script`).not.toMatch(/npm run|node (?:scripts|verify)\//);
    }
    expect(jobs.build, "the clean build must reproduce the recorded files").toContain("node scripts/release/candidate.js check --always");
    expect(jobs.draft, "the release stays a draft until the end").toContain("--draft --target \"$GITHUB_SHA\"");
    expect(jobs.release).toContain("--draft=false");
    // The release is the version's notes; the skins' files are released by their own Marketplace repositories.
    expect(release, "no file attached to this repository's release").not.toMatch(/gh release upload|dashhaus\.js/);
    const publish = jobs.publish;
    expect(publish, "npm's trusted publisher names this environment").toMatch(/^ {4}environment: npm$/m);
    expect(publish, "the publish job only needs Node and npm").toMatch(/uses: \.\/\.github\/actions\/setup\n\s+with:\n\s+install: "false"/);
    expect(publish, "it publishes in the pack's order").toContain("done < release/publish.tsv");
    expect(publish, "a tarball's own lifecycle scripts never run").toMatch(/npm publish "\.\/release\/\$file" [^\n]*--ignore-scripts/);
    expect(publish, "a version on npm is skipped only when it is this very file").toContain('sha1sum "release/$file"');
    expect(jobs.registry, "the registry smoke checks npm against the build's tarballs").toContain("--compare release");

    expect(jobs.release, "a stable release becomes the public site, built from its tag").toMatch(
      /if: env\.PRERELEASE != 'true'\n\s+run: gh workflow run docs\.yml --ref main -f tag="\$TAG"/,
    );
    for (const [name, job] of Object.entries(jobs)) {
      expect(job.includes("actions: write"), `${name} ${name === "release" ? "may" : "may not"} start a workflow`).toBe(name === "release");
    }

    const setup = read(".github/actions/setup/action.yml").split(/^\s+- /m).slice(1);
    for (const step of setup.filter((step) => /^name: (?:Restore node_modules|Restore npm's downloads|Install)$/m.test(step))) {
      expect(step, "install: false skips every install step").toMatch(/inputs\.install != 'false'/);
    }

    const ci = read(".github/workflows/ci.yml");
    expect(ci, "a pull request that ships carries its change note").toContain("run: node scripts/release/changes.js check-pr");
    expect(ci, "an untagged candidate packs the files it records").toContain("run: node scripts/release/candidate.js check\n");
  });

  it("deploys the public site only from a published release, and every branch's site to its preview", () => {
    // spec/release.md → The site: the site on Pages describes what npm and the Marketplace serve, never a branch.
    const docs = read(".github/workflows/docs.yml");
    const jobs = Object.fromEntries(
      docs.split(/^jobs:\n/m)[1].split(/^(?= {2}\S)/m).filter((block) => /^ {2}[\w-]+:/.test(block)).map((block) => [/^ {2}([\w-]+):/.exec(block)![1], block]),
    );
    expect(Object.keys(jobs)).toEqual(["preview", "site", "deploy"]);
    expect(jobs.site, "only a dispatch, the Release workflow's or by hand, builds the public site").toMatch(/^ {4}if: github\.event_name == 'workflow_dispatch'/m);
    expect(jobs.site, "from a published release's tag").toContain("ref: refs/tags/${{ steps.tag.outputs.tag }}");
    expect(jobs.site, "never a draft or a prerelease").toContain('if [ "$state" != published ]');
    expect(jobs.deploy, "Pages deploys only what the site job built").toMatch(/^ {4}needs: site$/m);
    expect(jobs.preview, "pull requests and main go to the preview").toMatch(/^ {4}if: github\.event_name != 'workflow_dispatch'$/m);
    for (const [name, job] of Object.entries(jobs)) {
      expect(job.includes("pages: write"), `${name} ${name === "deploy" ? "deploys" : "never deploys"} to Pages`).toBe(name === "deploy");
      expect(/secrets\.CLOUDFLARE_/.test(job), `${name} ${name === "preview" ? "holds" : "never holds"} the preview's secrets`).toBe(name === "preview");
    }
    expect(jobs.preview, "a fork's pull request, or no secrets yet, still builds the site").toContain("if: env.CLOUDFLARE_API_TOKEN != '' && env.CLOUDFLARE_ACCOUNT_ID != ''");
    expect(jobs.preview, "wrangler is pinned").toMatch(/WRANGLER: wrangler@\d+\.\d+\.\d+$/m);
  });
});

/** Whether Node `version` (`22.23.4`) satisfies an `engines.node` range, in the forms the lockfile uses. */
function nodeSatisfies(version: string, range: string): boolean {
  const have = version.split(".").map(Number);
  const cmp = (want: number[]) => {
    for (let i = 0; i < 3; i++) if ((have[i] ?? 0) !== (want[i] ?? 0)) return (have[i] ?? 0) - (want[i] ?? 0);
    return 0;
  };
  const test = (token: string) => {
    const [, op = "", raw] = /^(>=|<=|>|<|\^|~|=)?v?(.+)$/.exec(token) ?? [];
    if (raw === undefined || raw === "*" || raw === "x") return true;
    const parts = raw.split(".").filter((part) => part !== "*" && part !== "x").map(Number);
    if (parts.some(Number.isNaN)) throw new Error(`unreadable engines.node "${range}"`);
    const c = cmp(parts);
    if (op === ">=") return c >= 0;
    if (op === ">") return c > 0;
    if (op === "<=") return c <= 0;
    if (op === "<") return c < 0;
    // ^X.Y.Z keeps the major (all the lockfile's ranges are past 0.x), ~ and a bare X or X.Y keep what they name.
    const kept = op === "^" ? 1 : op === "~" ? Math.min(parts.length, 2) : parts.length;
    return c >= 0 && parts.slice(0, kept).every((part, i) => have[i] === part);
  };
  return range.split("||").some((set) => set.trim().replace(/([<>=^~]+)\s+/g, "$1").split(/\s+/).every(test));
}

describe("the release's publish step", () => {
  // The least reversible lines in the repository, run here as the workflow runs them: the step's own shell, pulled out
  // of release.yml, against a fake npm, a fake curl (its registry is a folder of shasums; FAKE_STATUS forces an answer)
  // and a portable sha1sum.
  const script = (/name: Publish to npm\n\s+run: \|\n([\s\S]*?)\n\n/.exec(read(".github/workflows/release.yml"))?.[1] ?? "").replace(/^ {10}/gm, "");
  const sha1 = (text: string) => createHash("sha1").update(text).digest("hex");

  function publish(packages: { name: string; version: string; file: string; text: string; onNpm?: string }[], prerelease = false, status = "") {
    const work = mkdtempSync(join(tmpdir(), "dashhaus-publish-"));
    try {
      for (const dir of ["bin", "registry", "release"]) mkdirSync(join(work, dir));
      writeFileSync(join(work, "bin/npm"), `#!/bin/bash
echo "$*" >> "$FAKE_LOG"
`);
      writeFileSync(join(work, "bin/curl"), `#!/bin/bash
url="\${!#}"; path="\${url#https://registry.npmjs.org/}"; key="\${path%/*}"; key="\${key/\\%2f/+}@\${path##*/}"
if [ -n "$FAKE_STATUS" ]; then printf 'busy\\n%s' "$FAKE_STATUS"; exit 0; fi
[ -f "$FAKE_REGISTRY/$key" ] || { printf 'version not found\\n404'; exit 0; }
printf '{"dist":{"shasum":"%s"}}\\n200' "$(cat "$FAKE_REGISTRY/$key")"
`);
      writeFileSync(join(work, "bin/sha1sum"), `#!/usr/bin/env node
const file = process.argv[2];
console.log(require("node:crypto").createHash("sha1").update(require("node:fs").readFileSync(file)).digest("hex") + "  " + file);
`);
      for (const tool of ["npm", "curl", "sha1sum"]) chmodSync(join(work, "bin", tool), 0o755);
      for (const pkg of packages) {
        writeFileSync(join(work, "release", pkg.file), pkg.text);
        if (pkg.onNpm !== undefined) writeFileSync(join(work, "registry", `${pkg.name}@${pkg.version}`.replace("/", "+")), sha1(pkg.onNpm));
      }
      writeFileSync(join(work, "release/publish.tsv"), packages.map(({ name, version, file }) => `${name}\t${version}\t${file}\n`).join(""));
      writeFileSync(join(work, "log"), "");
      const result = spawnSync("bash", ["-c", script], {
        cwd: work,
        encoding: "utf8",
        env: { ...process.env, PATH: `${join(work, "bin")}:${process.env.PATH}`, FAKE_REGISTRY: join(work, "registry"), FAKE_LOG: join(work, "log"), FAKE_STATUS: status, PRERELEASE: String(prerelease) },
      });
      return { status: result.status, output: result.stdout + result.stderr, published: readFileSync(join(work, "log"), "utf8").trim().split("\n").filter(Boolean) };
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }

  const core = { name: "@dashhaus/core", version: "0.3.0", file: "dashhaus-core-0.3.0.tgz", text: "core" };
  const orb = { name: "@dashhaus/orb", version: "0.3.0", file: "dashhaus-orb-0.3.0.tgz", text: "orb" };

  it("publishes in order, skipping a version npm holds as this very file", () => {
    expect(script).toContain("npm publish");
    // npm's CDN keeps a package's index for minutes: reading it here would leave one without this version cached.
    expect(script, "it reads npm's document for the version, never the package's index").not.toMatch(/npm view|npm info/);
    const run = publish([{ ...core, onNpm: "core" }, orb]);
    expect(run.status, run.output).toBe(0);
    expect(run.output).toContain("@dashhaus/core@0.3.0 is already on npm, this very file; skipped");
    expect(run.published).toEqual(["publish ./release/dashhaus-orb-0.3.0.tgz --provenance --ignore-scripts --tag latest"]);
  });

  it("sends a prerelease to next, never latest", () => {
    expect(publish([{ ...core, version: "0.3.0-rc.1" }], true).published).toEqual(["publish ./release/dashhaus-core-0.3.0.tgz --provenance --ignore-scripts --tag next"]);
  });

  it("stops before anything else when npm holds a different file under the version", () => {
    const run = publish([{ ...core, onNpm: "an older build" }, orb]);
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("@dashhaus/core@0.3.0 is on npm as a different file");
    expect(run.published).toEqual([]);
  });

  it("stops before publishing when npm answers neither the version nor a 404", () => {
    const run = publish([core, orb], false, "503");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("npm answered 503 for @dashhaus/core@0.3.0");
    expect(run.published).toEqual([]);
  });
});

describe("the pinned Node", () => {
  const nvmrc = read(".nvmrc").trim();
  const lock = JSON.parse(read("package-lock.json")) as {
    packages: Record<string, { engines?: { node?: string }; optional?: boolean }>;
  };

  it("is one exact version, the floor root and docs engines declare", () => {
    // An exact pin: `nvm use` on a bare `22` takes whichever 22 is installed, older than the dependencies allow.
    expect(nvmrc).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.engines).toEqual({ node: `>=${nvmrc}` });
    expect(JSON.parse(read("docs/package.json")).engines).toEqual({ node: `>=${nvmrc}` });
  });

  it("satisfies every locked package's engines.node, so an install prints no EBADENGINE", () => {
    // An optional package (another platform's binary) that doesn't fit is skipped without a warning.
    const unmet = Object.entries(lock.packages)
      .filter(([, entry]) => !entry.optional)
      .filter(([, entry]) => typeof entry.engines?.node === "string" && !nodeSatisfies(nvmrc, entry.engines.node))
      .map(([path, entry]) => `${path.replace(/^.*node_modules\//, "") || "dashhaus"} wants node ${entry.engines?.node}`);
    expect(unmet, `raise .nvmrc and the engines floors to meet them`).toEqual([]);
  });

  it("reads the ranges the lockfile writes", () => {
    expect(nodeSatisfies("22.23.4", "^22.22.2 || ^24.15.0 || >=26.0.0")).toBe(true);
    expect(nodeSatisfies("22.20.0", "^22.22.2 || ^24.15.0 || >=26.0.0")).toBe(false);
    expect(nodeSatisfies("22.20.0", ">=22.23.4")).toBe(false);
    expect(nodeSatisfies("22.23.4", ">= 20.19.0")).toBe(true);
    expect(nodeSatisfies("22.23.4", "^16.10.0 || ^18.0.0 || >=20.0.0")).toBe(true);
    expect(nodeSatisfies("22.23.4", "^18.0.0 || ^20.0.0")).toBe(false);
    expect(nodeSatisfies("22.23.4", "18 || 20 || >=22")).toBe(true);
    expect(nodeSatisfies("22.23.4", "6.* || 8.* || >= 10.*")).toBe(true);
    expect(nodeSatisfies("22.23.4", ">=16 || 14 >=14.17")).toBe(true);
    expect(nodeSatisfies("22.23.4", "*")).toBe(true);
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
