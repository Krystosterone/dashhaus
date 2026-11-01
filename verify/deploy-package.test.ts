// @vitest-environment node
/**
 * `@dashhaus/deploy` is the Node-only CLI: it loads the user's config, never a skin or a browser package, and the repo's
 * `dashboard.config.mjs` stays the one file outside orb that reaches orb's generated layout. The last test loads the
 * repo config from a copied, non-symlinked `@dashhaus/dashboard`, which is the install shape Node refuses to type-strip.
 */
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadDashboards } from "@dashhaus/deploy";
import type { DeployHa } from "@dashhaus/deploy";
import { GENERATED_SKINS } from "../scripts/generated-skins.js";

const root = process.cwd();
const PACKAGE = "packages/deploy";
const CONFIG_FILE = join(root, "dashboard.config.mjs");
const packageJson = JSON.parse(readFileSync(join(root, PACKAGE, "package.json"), "utf8"));

const read = (path: string) => readFileSync(join(root, path), "utf8");
const JS_SPECS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /^\s*import\s+["']([^"']+)["']/gm,
];
const specs = (path: string) => JS_SPECS.flatMap((pattern) => [...read(path).matchAll(pattern)].map((match) => match[1]));

/** Every source file under the paths, without the build output, dependencies or agent worktrees. */
function sources(paths: string[]): string[] {
  const found: string[] = [];
  const walk = (path: string) => {
    if (/^(node_modules|dist|storybook-static|\.git|\.agents|\.claude|coverage)$/.test(posix.basename(path))) return;
    const stat = statSync(join(root, path), { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isFile()) { found.push(path); return; }
    for (const entry of readdirSync(join(root, path), { withFileTypes: true })) walk(`${path}/${entry.name}`);
  };
  for (const path of paths) walk(path);
  return found.filter((path) => /\.(ts|tsx|js|mjs|mts)$/.test(path));
}

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

/** The websocket replies Orb's card factory asks for: states plus the registries it reads. */
const fakeHa: DeployHa = {
  async send(type) {
    if (type === "get_states") return [{ entity_id: "light.bed", state: "on", attributes: { friendly_name: "Bed" } }];
    if (type === "config/entity_registry/list_for_display") return undefined;
    if (type === "config/device_registry/list") return [];
    if (type === "config/area_registry/list") return [];
    throw new Error(`unexpected Home Assistant command ${type}`);
  },
};

describe("@dashhaus/deploy", () => {
  it("is a private Node bin with a pure config subpath", () => {
    expect(packageJson.name).toBe("@dashhaus/deploy");
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageJson.version).not.toBe("0.0.0");
    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe("module");
    expect(packageJson.bin).toEqual({ "dashhaus-deploy": "./bin.js" });
    expect(packageJson.exports).toEqual({
      ".": "./src/deploy.js",
      "./config": {
        types: "./src/config.d.ts",
        import: "./src/config.js",
        default: "./src/config.js",
      },
    });
    expect(packageJson.files).toEqual(["bin.js", "src/*.js", "src/*.d.ts", "README.md"]);
    expect(packageJson.engines).toEqual({ node: ">=22" });
    expect(Object.keys(packageJson.dependencies)).toEqual(["esbuild"]);
  });

  it("is wired into npm run deploy", () => {
    const rootPackage = JSON.parse(read("package.json"));
    expect(rootPackage.scripts.deploy).toBe("dashhaus-deploy");
    expect(rootPackage.dependencies["@dashhaus/deploy"]).toBe("*");
  });

  it("keeps @dashhaus/deploy/config free of imports, the loader and React", () => {
    const config = `${PACKAGE}/src/config.js`;
    expect(specs(config)).toEqual([]);
    expect(read(config).split("\n").filter((line) => /^\s*(?:import|export\s+.*\sfrom)\b/.test(line))).toEqual([]);
  });

  it("imports only Node builtins, esbuild and its own files", () => {
    const files = sources([PACKAGE]).filter((path) => /\.(js|mjs|mts)$/.test(path));
    const outside = files.flatMap((path) => specs(path).filter((spec) => !spec.startsWith(".") && !spec.startsWith("node:") && spec !== "esbuild").map((spec) => `${path} → ${spec}`));
    expect(outside).toEqual([]);
  });

  it("hardcodes neither this repo's Vite config nor its bundle", () => {
    const files = sources([PACKAGE]).filter((path) => /\.(js|mjs|mts)$/.test(path));
    expect(files.filter((path) => /vite\.lovelace\.config\.ts|dashhaus\.js/.test(read(path)))).toEqual([]);
  });

  it("keeps the repo's config the only outside importer of orb's generated layout", () => {
    const configImporters = sources(["dashboard.config.mjs", "src", "packages", "scripts", "verify", "apps", ".storybook"])
      .filter((path) => !path.startsWith("src/skins/orb/"))
      .filter((path) => specs(path).some((spec) => {
        if (spec === "@dashhaus/orb/lovelace/auto") return true;
        return spec.startsWith(".") && posix.normalize(posix.join(posix.dirname(path), spec)) === "src/skins/orb/lovelace/auto.ts";
      }));
    expect(configImporters).toEqual(["dashboard.config.mjs"]);
  });

  it("loads the repo's dashboards and card factories without Home Assistant", async () => {
    const { dashboards, pageTitle } = await loadDashboards({ file: CONFIG_FILE, env: {} });
    expect(pageTitle).toBe("Home");
    expect(dashboards.map(({ path, title, icon }) => ({ path, title, icon }))).toEqual([
      { path: "dashhaus-orb", title: "Home (Orb)", icon: "mdi:home-variant" },
      { path: "dashhaus-field", title: "Home (Field)", icon: "mdi:knob" },
      ...GENERATED_SKINS.map(({ id, title, icon }) => ({ path: `dashhaus-${id}`, title, icon })),
    ]);
    const orb = dashboards.find(({ path }) => path === "dashhaus-orb")!;
    const field = dashboards.find(({ path }) => path === "dashhaus-field")!;
    expect(await orb.card(fakeHa)).toEqual({
      card: {
        type: "custom:dashhaus-orb",
        title: "Home",
        sections: [{ title: "Other", cards: [{ entity: "light.bed", footprint: "compact" }] }],
      },
      made: "1 generated sections",
    });
    expect(await field.card(fakeHa)).toEqual({
      card: { type: "custom:dashhaus-field", title: "Home" },
      made: "every light and climate entity by area",
    });
  });

  it("registers a generated skin through generatedDashboards", async () => {
    const directory = await mkdtemp(join(root, ".deploy-config-"));
    directories.push(directory);
    await writeFile(join(directory, "dashboard.config.mjs"), `import { generatedDashboards } from "@dashhaus/deploy/config";
export default {
  bundle: "dist/cards.js",
  dashboards: generatedDashboards([{ id: "canvas", title: "Home (Canvas)", icon: "mdi:view-dashboard-outline" }]),
};
`);
    const { dashboards } = await loadDashboards({ file: join(directory, "dashboard.config.mjs"), env: {} });
    expect(dashboards).toMatchObject([{ path: "dashhaus-canvas", title: "Home (Canvas)", icon: "mdi:view-dashboard-outline" }]);
    expect(await dashboards[0].card(fakeHa)).toEqual({
      card: { type: "custom:dashhaus-canvas", title: "Home" },
      made: "the canvas skin's automatic layout",
    });
  });

  it("loads a config from a copied, non-symlinked @dashhaus/dashboard install", async () => {
    const app = await mkdtemp(join(tmpdir(), "deploy-copied-"));
    directories.push(app);
    await mkdir(join(app, "node_modules", "@dashhaus"), { recursive: true });
    await cp(join(root, "packages/dashboard"), join(app, "node_modules", "@dashhaus/dashboard"), { recursive: true });
    await symlink(join(root, "packages/deploy"), join(app, "node_modules", "@dashhaus/deploy"), "dir");
    await symlink(join(root, "src/skins/orb"), join(app, "node_modules", "@dashhaus/orb"), "dir");
    await symlink(join(root, "packages/bundle"), join(app, "node_modules", "@dashhaus/bundle"), "dir");
    await mkdir(join(app, "scripts"), { recursive: true });
    await cp(CONFIG_FILE, join(app, "dashboard.config.mjs"));
    await cp(join(root, "scripts/generated-skins.js"), join(app, "scripts/generated-skins.js"));
    expect(lstatSync(join(app, "node_modules", "@dashhaus/dashboard")).isSymbolicLink()).toBe(false);

    // A marker in the copy proves the CLI bundled the copy, not the repo's workspace symlink.
    const copiedSchema = join(app, "node_modules", "@dashhaus/dashboard/src/schema.ts");
    await writeFile(copiedSchema, `${await readFile(copiedSchema, "utf8")}\nexport const copiedMarker = "copied-dashboard-package";\n`);
    await writeFile(join(app, "copied.config.js"), `import { generatedDashboards } from "@dashhaus/deploy/config";
import { copiedMarker } from "@dashhaus/dashboard/schema";
export default {
  pageTitle: copiedMarker,
  bundle: "dist/dashhaus.js",
  dashboards: generatedDashboards([{ id: "copied", title: copiedMarker, icon: "mdi:home" }]),
};
`);
    const cli = join(root, "packages/deploy/bin.js");
    const help = spawnSync(process.execPath, [cli, "--config", join(app, "copied.config.js"), "--help"], { cwd: app, encoding: "utf8" });
    expect(help.status, help.stderr).toBe(0);
    expect(help.stdout).toContain("copied-dashboard-package");
    expect(help.stdout).toContain("/dashhaus-copied");

    const repo = spawnSync(process.execPath, [cli, "--config", join(app, "dashboard.config.mjs"), "--help"], { cwd: app, encoding: "utf8" });
    expect(repo.status, repo.stderr).toBe(0);
    expect(repo.stdout).toContain("Home (Orb)");
    expect(repo.stdout).toContain("Home (Field)");
  });
});
