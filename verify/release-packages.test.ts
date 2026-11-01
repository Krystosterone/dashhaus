/**
 * The three public packages share one release policy: one version, a real one, and packed manifests that drop the
 * workspace-only `source` condition and `private`, pin internal ranges, and keep the optional peers optional.
 * Behaviour of the packed tarballs (install, Node imports, typecheck, the deploy bin) is checked by
 * `npm run verify:packages`; this test catches metadata regressions before anything is built.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { publicPackages, publishManifest } from "../scripts/release/manifest.mjs";
import type { PackageManifest } from "../scripts/release/manifest.mjs";

const root = process.cwd();
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
const manifests: Record<string, PackageManifest> = Object.fromEntries(publicPackages.map((pkg) => [pkg.key, read(`${pkg.dir}/package.json`)]));

describe("public packages", () => {
  it("share one real version and pin @dashhaus/dashboard's core range", () => {
    const version = manifests.core.version;
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version).not.toBe("0.0.0");
    for (const pkg of publicPackages) expect(manifests[pkg.key].version, pkg.name).toBe(version);
    expect(manifests.dashboard.dependencies?.["@dashhaus/core"]).toBe(`^${version}`);
    const template = read("packages/create-dashhaus-skin/src/templates/package.json");
    expect(template.dependencies?.["@dashhaus/core"]).toBe(`^${version}`);
    expect(template.dependencies?.["@dashhaus/dashboard"]).toBe(`^${version}`);
    expect(template.devDependencies?.["@dashhaus/deploy"]).toBe(`^${version}`);
  });

  it("publishes the React 18 and 19 peer range the consumer test covered", () => {
    for (const key of ["core", "dashboard", "orb", "field"] as const) {
      expect(manifests[key].peerDependencies?.react, `${manifests[key].name} accepts React 19`).toBe("^18.3.1 || ^19.0.0");
    }
    for (const key of ["dashboard", "orb", "field"] as const) {
      expect(manifests[key].peerDependencies?.["react-dom"], `${manifests[key].name} accepts React 19`).toBe("^18.3.1 || ^19.0.0");
    }
    const template = read("packages/create-dashhaus-skin/src/templates/package.json");
    expect(template.peerDependencies?.react).toBe("^18.3.1 || ^19.0.0");
    expect(template.peerDependencies?.["react-dom"]).toBe("^18.3.1 || ^19.0.0");
  });

  it("resolve source in the workspace and built files in a packed install", () => {
    for (const key of ["core", "dashboard"]) {
      const manifest = manifests[key];
      expect(manifest.files, `${manifest.name} ships dist and its README`).toEqual(["dist", "README.md"]);
      expect(manifest.sideEffects).toBe(false);
      for (const [subpath, target] of Object.entries(manifest.exports)) {
        expect(target, `${manifest.name} ${subpath}`).toBeTypeOf("object");
        const source = target.source;
        expect(source, `${manifest.name} ${subpath} source`).toMatch(/^\.\/src\//);
        if (!source) throw new Error(`${manifest.name} ${subpath}: missing source export`);
        if (source.includes("*")) {
          expect(existsSync(join(root, "packages", key, source.slice(0, source.indexOf("*")))), `${manifest.name} ${subpath} source folder exists`).toBe(true);
        } else {
          expect(source, `${manifest.name} ${subpath} source file`).toMatch(/\.(?:ts|tsx)$/);
          expect(existsSync(join(root, "packages", key, source)), `${manifest.name} ${subpath} source exists`).toBe(true);
        }
        if (target.types) expect(target.types, `${manifest.name} ${subpath} types`).toMatch(/^\.\/dist\/.+\.d\.ts$/);
        if (target.import) {
          expect(target.import, `${manifest.name} ${subpath} import`).toMatch(/^\.\/dist\/.+\.js$/);
          expect(target.default, `${manifest.name} ${subpath} default`).toBe(target.import);
        } else {
          expect(target.default, `${manifest.name} ${subpath} default`).toMatch(/^\.\/dist\//);
        }
        expect(target.default).not.toMatch(/\.tsx?$/);
      }
    }
  });

  it("ships the skins, the bundle and the scaffolder from built dist", () => {
    for (const key of ["orb", "field"] as const) {
      const manifest = manifests[key];
      expect(manifest.files, `${manifest.name} ships dist and its README`).toEqual(["dist", "README.md"]);
      expect(manifest.sideEffects, `${manifest.name} keeps its stylesheet side effect`).toEqual(["**/*.css"]);
      for (const subpath of [".", "./lovelace/card", "./styles/tokens.css"]) {
        expect(manifest.exports?.[subpath], `${manifest.name} declares ${subpath}`).toBeTypeOf("object");
      }
      expect(manifest.dependencies?.["@dashhaus/core"]).toBe(`^${manifests.core.version}`);
      expect(manifest.dependencies?.["@dashhaus/dashboard"]).toBe(`^${manifests.dashboard.version}`);
    }
    expect(manifests.orb.exports?.["./lovelace/auto"]?.source).toBe("./lovelace/auto.ts");
    expect(manifests.bundle.dependencies).toBeUndefined();
    expect(manifests.bundle.exports?.["."]?.source).toBe("./index.mjs");
    expect(manifests.scaffold.bin).toEqual({ "create-dashhaus-skin": "./bin.mjs" });
    expect(manifests.scaffold.exports?.["."]?.source).toBe("./src/index.js");
  });

  it("packs without private, source conditions or wildcard ranges", () => {
    for (const pkg of publicPackages) {
      const packed = publishManifest(manifests[pkg.key]);
      expect(packed.private).toBeUndefined();
      expect(JSON.stringify(packed.exports)).not.toContain('"source"');
      expect(packed.version).toBe(manifests[pkg.key].version);
      for (const field of ["dependencies", "peerDependencies", "optionalDependencies"] as const) {
        for (const [name, range] of Object.entries(packed[field] ?? {})) {
          expect(String(range), `${packed.name} ${field} ${name}`).not.toContain("*");
        }
      }
    }
    expect(publishManifest(manifests.core).peerDependenciesMeta?.["home-assistant-js-websocket"]?.optional).toBe(true);
    expect(publishManifest(manifests.dashboard).peerDependenciesMeta?.["home-assistant-js-websocket"]?.optional).toBe(true);
    expect(publishManifest(manifests.deploy).bin).toEqual({ "dashhaus-deploy": "./bin.mjs" });
    expect(publishManifest(manifests.deploy).engines).toEqual({ node: ">=22" });
    for (const pkg of publicPackages) expect(publishManifest(manifests[pkg.key]).files, pkg.name).toContain("README.md");
  });

  it("refuses a package without a README in its files, a placeholder version, an unpinned internal range or a TypeScript export target", () => {
    expect(() => publishManifest({ ...manifests.core, files: ["dist"] })).toThrow(/README\.md/);
    expect(() => publishManifest({ ...manifests.core, version: "0.0.0" })).toThrow(/real semver/);
    expect(() => publishManifest({ ...manifests.dashboard, dependencies: { "@dashhaus/core": "*" } })).toThrow(/expected/);
    expect(() => publishManifest({ ...manifests.core, exports: { ".": { import: "./src/index.ts", default: "./src/index.ts" } } }))
      .toThrow(/built dist files/);
  });
});
