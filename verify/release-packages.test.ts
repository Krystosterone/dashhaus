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
  it("share one real version and pin @scope/dashboard's core range", () => {
    const version = manifests.core.version;
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version).not.toBe("0.0.0");
    for (const pkg of publicPackages) expect(manifests[pkg.key].version, pkg.name).toBe(version);
    expect(manifests.dashboard.dependencies?.["@scope/core"]).toBe(`^${version}`);
  });

  it("resolve source in the workspace and built files in a packed install", () => {
    for (const key of ["core", "dashboard"]) {
      const manifest = manifests[key];
      expect(manifest.files, `${manifest.name} ships only dist`).toEqual(["dist"]);
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
    expect(publishManifest(manifests.deploy).bin).toEqual({ "home-dashboard-deploy": "./bin.mjs" });
    expect(publishManifest(manifests.deploy).engines).toEqual({ node: ">=22" });
  });

  it("refuses a placeholder version, an unpinned internal range or a TypeScript export target", () => {
    expect(() => publishManifest({ ...manifests.core, version: "0.0.0" })).toThrow(/real semver/);
    expect(() => publishManifest({ ...manifests.dashboard, dependencies: { "@scope/core": "*" } })).toThrow(/expected/);
    expect(() => publishManifest({ ...manifests.core, exports: { ".": { import: "./src/index.ts", default: "./src/index.ts" } } }))
      .toThrow(/built dist files/);
  });
});
