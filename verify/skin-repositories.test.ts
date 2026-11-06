/**
 * Each skin's own Marketplace repository (scripts/skin-repositories.js, spec/release.md → The skin repositories) is
 * kept here, at hacs/<repository>/, and copied there by the operator:
 *
 * - every skin repository carries the same files, word for word once the names are swapped, and the mirror script is
 *   byte for byte the same in each, since it reads which skin from the repository's name;
 * - its workflows pin the actions this repository pins;
 * - its mirror takes the file from npm only when the tarball is the one npm names and its provenance names this
 *   repository's release workflow on main: checked here on a real version's attestations (`verify/fixtures/`);
 * - its README, the page HACS shows, is the skin's alone above one foot that names Dashhaus;
 * - what Add dashboard lists is what the repository says: the skin's strategy has its name, icon and words, and its
 *   type is the repository's name.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKIN_REPOSITORIES, assetName, myLink, pageUrl } from "../scripts/skin-repositories.js";
import { SKIN_RESOURCES } from "../scripts/resources.js";
import { ORB_STRATEGY } from "../src/skins/orb/lovelace/strategy";
import { FIELD_STRATEGY } from "../src/skins/field/lovelace/strategy";
// The mirror is plain Node ESM that a skin repository runs as is, with no declarations beside it; its checks are pure.
// @ts-expect-error -- typed below, as this test uses it
import * as mirrorModule from "../hacs/orb-dashboard/.github/mirror.js";

type Skin = { owner: string; repository: string; skin: string; name: string; package: string; asset: string };
const { SOURCE, checkIntegrity, checkProvenance, releaseNotes, skinOf } = mirrorModule as {
  SOURCE: Record<string, string>;
  checkIntegrity(tarball: Buffer, integrity: string): string;
  checkProvenance(attestations: unknown, version: { name: string; version: string; sha512: string }): { commit: string; run?: string };
  releaseNotes(skin: Skin, version: string, provenance: { commit: string; run?: string }): string;
  skinOf(fullName: string | undefined): Skin;
};

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const STRATEGIES = { orb: ORB_STRATEGY, field: FIELD_STRATEGY };

function walk(dir: string, base = ""): string[] {
  return readdirSync(join(root, dir, base), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(dir, join(base, entry.name)) : [join(base, entry.name)],
  ).sort();
}

/** `uses: owner/action@sha` pins in a workflow, by action. */
const pins = (text: string) => Object.fromEntries([...text.matchAll(/uses: ([\w-]+\/[\w-]+)@([0-9a-f]{40})/g)].map((match) => [match[1], match[2]]));

describe("the skin repositories", () => {
  it("has a folder for every skin repository, and no other, each mirroring its skin's resource", () => {
    expect(readdirSync(join(root, "hacs")).sort()).toEqual(SKIN_REPOSITORIES.map((entry) => entry.repository).sort());
    expect(SKIN_REPOSITORIES.map((entry) => [entry.skin, entry.repository, assetName(entry)])).toEqual(
      SKIN_RESOURCES.map((resource: { id: string; repository?: string; file: string }) => [resource.id, resource.repository, resource.file]),
    );
  });

  it("carries the same files in each, word for word once the names are swapped, and one mirror script", () => {
    const [first, ...rest] = SKIN_REPOSITORIES;
    const files = walk(`hacs/${first.repository}`);
    expect(files).toEqual([".github/mirror.js", ".github/workflows/release.yml", ".github/workflows/validate.yml", "README.md", "hacs.json"]);
    for (const entry of rest) {
      expect(walk(`hacs/${entry.repository}`)).toEqual(files);
      expect(read(`hacs/${entry.repository}/.github/mirror.js`), "the mirror reads its skin from the repository's name").toBe(read(`hacs/${first.repository}/.github/mirror.js`));
      // The README describes its own skin; everything else is the same file.
      for (const file of files.filter((name) => name !== "README.md" && name !== ".github/mirror.js")) {
        const swapped = read(`hacs/${first.repository}/${file}`)
          .replaceAll(first.repository, entry.repository).replaceAll(first.package, entry.package).replace(/\bOrb\b/g, entry.name);
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

  it("lists in Add dashboard what its repository says: the skin's name, icon and words, on a strategy named after it", () => {
    for (const entry of SKIN_REPOSITORIES) {
      const strategy = STRATEGIES[entry.skin];
      expect(strategy.type).toBe(entry.repository);
      expect({ name: strategy.name, icon: strategy.icon, description: strategy.description, documentationURL: strategy.documentationURL })
        .toEqual({ name: entry.name, icon: entry.icon, description: entry.description, documentationURL: pageUrl(entry) });
      expect(existsSync(join(root, "docs/src/content/docs", `${entry.page}.mdx`)), `docs page ${entry.page}`).toBe(true);
    }
  });

  it("is started by this repository's Release workflow, every skin repository after the release", () => {
    const listings = read(".github/workflows/release.yml").split(/^ {2}listings:\n/m)[1] ?? "";
    expect(listings, "the Release workflow has a listings job").not.toBe("");
    expect(/^ {10}repositories=\(([^)]*)\)$/m.exec(listings)?.[1].split(" ")).toEqual(SKIN_REPOSITORIES.map((entry) => entry.repository));
    expect(listings, "it waits for each release").toContain('until gh release view "v$VERSION" -R "$OWNER/$repository"');
  });

  it("pins the actions this repository pins, and builds nothing", () => {
    const ours = { ...pins(read(".github/workflows/release.yml")), ...pins(read(".github/workflows/hacs.yml")), ...pins(read(".github/actions/setup/action.yml")) };
    for (const entry of SKIN_REPOSITORIES) {
      for (const file of ["release.yml", "validate.yml"]) {
        const workflow = read(`hacs/${entry.repository}/.github/workflows/${file}`);
        const theirs = pins(workflow);
        expect(Object.keys(theirs).length).toBeGreaterThan(0);
        for (const [action, sha] of Object.entries(theirs)) expect(sha, `${entry.repository}/${file}: ${action}`).toBe(ours[action]);
        expect(workflow, `${entry.repository}/${file} builds nothing`).not.toMatch(/npm run|npm ci|build:ha|git clone/);
      }
      const release = read(`hacs/${entry.repository}/.github/workflows/release.yml`).replace(/^\s*#.*$/gm, "");
      // The order that matters: nothing is released before the provenance and the signatures pass.
      const steps = ["node .github/mirror.js latest", "node .github/mirror.js fetch", "npm audit signatures", "gh release create"].map((step) => release.indexOf(step));
      expect(steps.every((at) => at > 0), "every step is there").toBe(true);
      expect([...steps].sort((a, b) => a - b), "latest, fetch, signatures, then the release").toEqual(steps);
      expect(release).toContain(`npm install --ignore-scripts --no-audit --no-fund "${entry.package}@$VERSION"`);
      // Started, never scheduled: the Release workflow here hands it the version it just published.
      expect(release, "no schedule").not.toMatch(/^\s*schedule:/m);
      expect(release).toMatch(/^on:\n {2}workflow_dispatch:\n {4}inputs:\n {6}version:/m);
      expect(release).toContain(`"mirror/${assetName(entry)}"`);
    }
  });
});

describe("the mirror's checks", () => {
  // A real version's attestations, as npm serves them: @dashhaus/core 0.3.0, published by this repository's release.
  const attestations = JSON.parse(read("verify/fixtures/npm-attestations-dashhaus-core-0.3.0.json"));
  const sha512 = "7fb7973731f110af42d835d0642560abd58474033d44bff3603de3cda002f77af27d56c58d159c739b484d84665c2c2e9929a5d6c3d9454eff8a90fad4f52922";
  const version = { name: "@dashhaus/core", version: "0.3.0", sha512 };

  it("reads its skin from the repository's name", () => {
    expect(skinOf("Krystosterone/orb-dashboard")).toEqual({ owner: "Krystosterone", repository: "orb-dashboard", skin: "orb", name: "Orb", package: "@dashhaus/orb", asset: "orb-dashboard.js" });
    expect(skinOf("Krystosterone/field-dashboard").asset).toBe("field-dashboard.js");
    expect(() => skinOf("Krystosterone/dashhaus")).toThrow(/not a skin's repository/);
    expect(() => skinOf(undefined)).toThrow(/not a skin's repository/);
    for (const entry of SKIN_REPOSITORIES) {
      expect(skinOf(`Krystosterone/${entry.repository}`)).toMatchObject({ package: entry.package, asset: assetName(entry), name: entry.name });
    }
  });

  it("takes a tarball only when its sha512 is the integrity npm names", () => {
    const tarball = Buffer.from("a tarball");
    const integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
    expect(checkIntegrity(tarball, integrity)).toBe(createHash("sha512").update(tarball).digest("hex"));
    expect(() => checkIntegrity(Buffer.from("another"), integrity)).toThrow(/sha512 differs/);
    expect(() => checkIntegrity(tarball, "sha1-abc")).toThrow(/no sha512 integrity/);
  });

  it("accepts a real version built by this repository's release workflow on main, and says which commit", () => {
    expect(SOURCE).toEqual({ repository: "https://github.com/Krystosterone/dashhaus", workflow: ".github/workflows/release.yml", ref: "refs/heads/main" });
    expect(checkProvenance(attestations, version)).toEqual({
      commit: "014c5167b74c003cbd4352a972edd3d12c297a2c",
      run: "https://github.com/Krystosterone/dashhaus/actions/runs/42147684989/attempts/1",
    });
  });

  it("refuses another tarball, another version, another workflow or no provenance", () => {
    expect(() => checkProvenance(attestations, { ...version, sha512: "0".repeat(128) })).toThrow(/another tarball/);
    expect(() => checkProvenance(attestations, { ...version, version: "0.3.1" })).toThrow(/not for pkg:npm\/%40dashhaus\/core@0\.3\.1/);
    expect(() => checkProvenance({ attestations: [] }, version)).toThrow(/0 SLSA provenance statements/);
    // The same statement, rewritten as if another repository's workflow had built it.
    const forged = structuredClone(attestations);
    const slsa = forged.attestations.find((entry: { predicateType: string }) => entry.predicateType === "https://slsa.dev/provenance/v1");
    const statement = JSON.parse(Buffer.from(slsa.bundle.dsseEnvelope.payload, "base64").toString("utf8"));
    statement.predicate.buildDefinition.externalParameters.workflow.repository = "https://github.com/someone/fork";
    slsa.bundle.dsseEnvelope.payload = Buffer.from(JSON.stringify(statement)).toString("base64");
    expect(() => checkProvenance(forged, version)).toThrow(/built from repository https:\/\/github\.com\/someone\/fork/);
  });

  it("writes release notes that say where the file came from", () => {
    const notes = releaseNotes(skinOf("Krystosterone/orb-dashboard"), "0.4.0", { commit: "014c5167b74c003cbd4352a972edd3d12c297a2c", run: "https://example.com/run" });
    expect(notes).toMatch(/^Orb 0\.4\.0, the file inside \[@dashhaus\/orb@0\.4\.0\]\(https:\/\/www\.npmjs\.com\/package\/@dashhaus\/orb\/v\/0\.4\.0\)/);
    expect(notes).toContain("/commit/014c5167b74c003cbd4352a972edd3d12c297a2c");
  });
});
