/**
 * Every public package owns its typecheck and its Vitest project. A package dropped from either list would still let
 * `npm run check` pass while its tests stopped running, so the root config, the package tsconfigs and the typecheck
 * script are pinned here.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { projects } from "../config/vitest.projects";

const root = process.cwd();
const read = (path: string) => JSON.parse(readFileSync(join(root, path), "utf8"));
const packages = ["core", "dashboard", "deploy"];

/** A Vitest project as the root config writes it. */
type Project = { test?: { name?: string; include?: string[]; environment?: string } };

const project = (name: string) => (projects as Project[]).find((entry) => entry.test?.name === name)?.test;

describe("workspace projects", () => {
  it("gives every public package its own tsconfig, rooted at the shared base", () => {
    expect(read("tsconfig.json").extends).toBe("./config/tsconfig.base.json");
    expect(read("tsconfig.json").include).not.toContain("packages/*/src");
    for (const name of packages) {
      const tsconfig = read(`packages/${name}/tsconfig.json`);
      expect(tsconfig.extends, `${name} extends the shared base`).toBe("../../config/tsconfig.base.json");
      expect(tsconfig.include, `${name} owns its src`).toEqual(["src"]);
      const build = `packages/${name}/tsconfig.build.json`;
      if (existsSync(join(root, build))) expect(read(build).extends, `${name} builds from its package config`).toBe("./tsconfig.json");
    }
  });

  it("runs one Vitest project per public package beside the root app", () => {
    expect(Object.fromEntries(projects.map((entry) => [entry.test?.name, entry.test?.environment]))).toEqual({
      root: "jsdom",
      generators: "node",
      core: "jsdom",
      dashboard: "jsdom",
      deploy: "node",
    });
    expect(project("core")?.include, "core's tests are in its project").toEqual(["packages/core/src/**/*.test.{ts,tsx}"]);
    expect(project("dashboard")?.include, "dashboard's tests are in its project").toEqual(["packages/dashboard/src/**/*.test.{ts,tsx}"]);
    expect(project("deploy")?.include, "deploy's tests are in its project").toEqual(["packages/deploy/src/**/*.test.ts"]);
    expect(project("root")?.include, "the root project holds the app and the repo checks").toEqual([
      "src/**/*.test.{ts,tsx}",
      "verify/**/*.test.{ts,tsx}",
    ]);
    expect(project("generators")?.include, "the generators are Node-only, in their own project").toEqual(["scripts/*/*.test.ts"]);
  });

  it("typechecks the root and every package from the one command", () => {
    const typecheck = read("package.json").scripts.typecheck as string;
    for (const name of packages) expect(typecheck, `${name} is in npm run typecheck`).toContain(`-p packages/${name}/tsconfig.json`);
    expect(typecheck.startsWith("tsc --noEmit"), "the root app is typechecked first").toBe(true);
  });
});
