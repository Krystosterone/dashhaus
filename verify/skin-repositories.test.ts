/**
 * Each skin's own Marketplace repository (scripts/skin-repositories.js, spec/release.md → The skin repositories) is
 * kept here, in `hacs/<repository>/`, and copied there: this holds the copies to the list and to each other, so a
 * change reaches both skins and nothing drifts from what the monorepo itself runs.
 *
 * - every entry has its folder, and `hacs/` holds no other;
 * - the two repositories carry the same files, word for word once the skin's names are swapped;
 * - their workflows pin the actions the monorepo pins, so Dependabot's bumps here are theirs too;
 * - the build, the Release workflow's check and the journey name the same files;
 * - each skin has its landing page and its bundle entry.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKIN_REPOSITORIES, assetName, entryPath, myLink, pageUrl } from "../scripts/skin-repositories.js";
import { SKIN_BUNDLES } from "../scripts/build-bundle.js";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function walk(dir: string, base = ""): string[] {
  return readdirSync(join(root, dir, base), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(dir, join(base, entry.name)) : [join(base, entry.name)],
  ).sort();
}

/** `uses: owner/action@sha` pins in a workflow, by action. */
const pins = (text: string) => Object.fromEntries([...text.matchAll(/uses: ([\w-]+\/[\w-]+)@([0-9a-f]{40})/g)].map((match) => [match[1], match[2]]));

describe("the skin repositories", () => {
  it("has a folder for every skin repository, and no other", () => {
    expect(readdirSync(join(root, "hacs")).sort()).toEqual(SKIN_REPOSITORIES.map((entry) => entry.repository).sort());
  });

  it("carries the same files in each, word for word once the names are swapped", () => {
    const [first, ...rest] = SKIN_REPOSITORIES;
    const files = walk(`hacs/${first.repository}`);
    expect(files).toEqual([".github/workflows/release.yml", ".github/workflows/validate.yml", "README.md", "hacs.json"]);
    for (const entry of rest) {
      expect(walk(`hacs/${entry.repository}`)).toEqual(files);
      // The README describes its own skin; everything else is the same file.
      for (const file of files.filter((name) => name !== "README.md")) {
        const swapped = read(`hacs/${first.repository}/${file}`).replaceAll(first.repository, entry.repository).replace(/\bOrb\b/g, entry.name);
        expect(read(`hacs/${entry.repository}/${file}`), `hacs/${entry.repository}/${file}`).toBe(swapped);
      }
    }
  });

  it("names each skin in its hacs.json and README, with its My link and its page", () => {
    for (const entry of SKIN_REPOSITORIES) {
      expect(JSON.parse(read(`hacs/${entry.repository}/hacs.json`))).toEqual({ name: entry.name, hide_default_branch: true });
      const readme = read(`hacs/${entry.repository}/README.md`);
      expect(readme.startsWith(`# ${entry.name}\n`)).toBe(true);
      expect(readme).toContain(myLink(entry));
      expect(readme).toContain(pageUrl(entry));
      expect(readme, "the README's one way to what the skin is drawn on is its foot").toMatch(/\n---\n\n[^\n]*\[Dashhaus\]/);
      expect(readme.split("\n---\n")[0], "above the foot, the README is the skin's alone").not.toMatch(/Dashhaus/);
    }
  });

  it("pins the actions the monorepo pins", () => {
    const ours = { ...pins(read(".github/workflows/release.yml")), ...pins(read(".github/workflows/hacs.yml")) };
    for (const entry of SKIN_REPOSITORIES) {
      for (const file of ["release.yml", "validate.yml"]) {
        const theirs = pins(read(`hacs/${entry.repository}/.github/workflows/${file}`));
        expect(Object.keys(theirs).length).toBeGreaterThan(0);
        for (const [action, sha] of Object.entries(theirs)) expect(sha, `${entry.repository}/${file}: ${action}`).toBe(ours[action]);
      }
    }
  });

  it("builds, checks and installs the same files the list names", () => {
    expect(SKIN_BUNDLES).toEqual(SKIN_REPOSITORIES.map((entry) => ({ entry: entryPath(entry), file: assetName(entry) })));
    const release = read(".github/workflows/release.yml");
    expect(release).toContain(`for file in ${SKIN_REPOSITORIES.map(assetName).join(" ")}; do cmp "dist/$file" "release/$file"; done`);
    const journey = read("verify/dx/skin.js");
    for (const entry of SKIN_REPOSITORIES) {
      expect(journey).toContain(`{ skin: "${entry.skin}", name: "${entry.name}", repository: "${entry.repository}", tag: "dashhaus-${entry.skin}", icon: "${entry.icon}" }`);
      expect(existsSync(join(root, entryPath(entry))), entryPath(entry)).toBe(true);
      expect(existsSync(join(root, "docs/src/content/docs", `${entry.page}.mdx`)), `docs page ${entry.page}`).toBe(true);
      expect(pageUrl(entry)).toBe(`https://krystosterone.github.io/dashhaus/${entry.page}/`);
    }
  });
});
