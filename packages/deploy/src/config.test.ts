// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DeployConfigError, loadDashboards, readConfig, resolveBundle, resolveDashboards } from "./config.mjs";
import type { DeployConfig, DeployDashboard } from "./config.mjs";

const directories: string[] = [];

async function temporary() {
  const directory = await mkdtemp(join(tmpdir(), "deploy-config-"));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const dashboard = (overrides: Partial<DeployDashboard> = {}): DeployDashboard => ({
  path: "home-dashboard",
  title: "Home",
  icon: "mdi:home",
  async card() { return { card: {}, made: "" }; },
  ...overrides,
});

const config = (overrides: Partial<DeployConfig> = {}): DeployConfig => ({
  bundle: "dist/home-dashboard.js",
  dashboards: [dashboard()],
  ...overrides,
});

describe("resolveDashboards", () => {
  it("applies only the .env overrides each dashboard names", () => {
    const declared = config({
      dashboards: [
        dashboard({ path: "home-dashboard", title: "Home (Orb)", env: { path: "HA_DASHBOARD", title: "HA_DASHBOARD_TITLE" } }),
        dashboard({ path: "home-dashboard-field", title: "Home (Field)", env: { path: "HA_FIELD_DASHBOARD", title: "HA_FIELD_DASHBOARD_TITLE" } }),
        dashboard({ path: "home-dashboard-canvas", title: "Home (Canvas)" }),
      ],
    });
    const { dashboards, pageTitle } = resolveDashboards(declared, {
      HA_DASHBOARD: "my-house",
      HA_DASHBOARD_TITLE: "My House",
      HA_FIELD_DASHBOARD: "",
      HA_FIELD_DASHBOARD_TITLE: "Field House",
    });
    expect(pageTitle).toBe("Home");
    expect(dashboards.map(({ path, title }) => [path, title])).toEqual([
      ["my-house", "My House"],
      ["home-dashboard-field", "Field House"],
      ["home-dashboard-canvas", "Home (Canvas)"],
    ]);
  });

  it("refuses a path without a hyphen and says why", () => {
    const bad = config({ dashboards: [dashboard({ path: "home" })] });
    expect(() => resolveDashboards(bad, {})).toThrowError(DeployConfigError);
    expect(() => resolveDashboards(bad, {})).toThrowError('dashboard paths must contain a hyphen (Home Assistant requires it): "home"');
  });

  it("refuses two dashboards on one path, including one the .env overrides make", () => {
    const duplicate = config({ dashboards: [dashboard({ path: "home-a" }), dashboard({ path: "home-a" })] });
    expect(() => resolveDashboards(duplicate, {})).toThrowError("dashboard paths must be unique: home-a");
    const overridden = config({
      dashboards: [
        dashboard({ path: "home-orb", env: { path: "HA_DASHBOARD" } }),
        dashboard({ path: "home-field" }),
      ],
    });
    expect(() => resolveDashboards(overridden, { HA_DASHBOARD: "home-field" })).toThrowError("dashboard paths must be unique: home-field");
  });

  it("requires the fields deploy reads", () => {
    const noCard = { ...config(), dashboards: [{ path: "home-a", title: "Home", icon: "mdi:home" }] } as unknown as DeployConfig;
    expect(() => resolveDashboards(noCard, {})).toThrowError("dashboards[0].card must be a function");
  });
});

describe("resolveBundle", () => {
  it("resolves the bundle against the config and derives the resource URL from its folder and name", () => {
    const directory = "/configs";
    const target = resolveBundle(config({ bundle: "dist/home-dashboard.js" }), join(directory, "dashboard.config.mjs"));
    expect(target).toEqual({
      file: join(directory, "dist", "home-dashboard.js"),
      name: "home-dashboard.js",
      folder: "home-dashboard",
      resourcePath: "/local/home-dashboard/home-dashboard.js",
    });
  });

  it("keeps an absolute bundle path and its name's folder", () => {
    const target = resolveBundle(config({ bundle: "/tmp/out/cards.js" }), "/configs/dashboard.config.mjs");
    expect(target.file).toBe("/tmp/out/cards.js");
    expect(target.resourcePath).toBe("/local/cards/cards.js");
  });

  it("refuses a config without a bundle and says what to add", () => {
    expect(() => resolveBundle(config({ bundle: "" }), "/configs/dashboard.config.mjs")).toThrowError(DeployConfigError);
    expect(() => resolveBundle(config({ bundle: "" }), "/configs/dashboard.config.mjs")).toThrowError('the deploy config must name the bundle to upload: bundle: "dist/cards.js"');
  });
});

describe("readConfig", () => {
  it("bundles a config outside the repo, so it may import TypeScript and packages", async () => {
    const directory = await temporary();
    await writeFile(join(directory, "title.ts"), 'type Title = string;\nexport const title: Title = "Flat";\n');
    await writeFile(join(directory, "dashboard.config.mjs"), [
      'import { title } from "./title.ts";',
      "export default { pageTitle: title, bundle: \"dist/flat.js\", dashboards: [] };",
    ].join("\n"));
    const loaded = await readConfig(join(directory, "dashboard.config.mjs"));
    expect(loaded.pageTitle).toBe("Flat");
    expect(resolveBundle(loaded, join(directory, "dashboard.config.mjs")).resourcePath).toBe("/local/flat/flat.js");
  });

  it("keeps a build callback, which the deploy runs in the config's directory", async () => {
    const directory = await temporary();
    await writeFile(join(directory, "dashboard.config.mjs"), "export default { bundle: \"out.js\", build() {}, dashboards: [] };\n");
    const loaded = await readConfig(join(directory, "dashboard.config.mjs"));
    expect(loaded.build).toBeTypeOf("function");
  });

  it("refuses a missing file, a config without dashboards and a bundle that is not a string", async () => {
    const directory = await temporary();
    await expect(readConfig(join(directory, "missing.mjs"))).rejects.toThrowError("Could not load");
    await writeFile(join(directory, "no-dashboards.mjs"), "export default { bundle: \"out.js\" };\n");
    await expect(readConfig(join(directory, "no-dashboards.mjs"))).rejects.toThrowError("must export default");
    await writeFile(join(directory, "no-bundle.mjs"), "export default { dashboards: [] };\n");
    await expect(readConfig(join(directory, "no-bundle.mjs"))).rejects.toThrowError("bundle must name the file to upload");
  });

  it("reports a syntax error at the config's file and line", async () => {
    const directory = await temporary();
    await writeFile(join(directory, "broken.mjs"), "export default {\n  dashboards: [\n};\n");
    await expect(readConfig(join(directory, "broken.mjs"))).rejects.toThrowError("Could not load");
  });
});

describe("loadDashboards", () => {
  it("reads a config and applies the environment in one step", async () => {
    const directory = await temporary();
    await writeFile(join(directory, "dashboard.config.mjs"), [
      "export default {",
      '  pageTitle: "Home",',
      '  bundle: "dist/home-dashboard.js",',
      "  dashboards: [{",
      '    path: "home-dashboard",',
      '    title: "Home",',
      '    icon: "mdi:home",',
      '    env: { path: "HA_DASHBOARD" },',
      "    async card() { return { card: { type: \"custom:home-dashboard\" }, made: \"one card\" }; },",
      "  }],",
      "};",
    ].join("\n"));
    const { dashboards } = await loadDashboards({ file: join(directory, "dashboard.config.mjs"), env: { HA_DASHBOARD: "my-house" } });
    expect(dashboards.map(({ path }) => path)).toEqual(["my-house"]);
  });
});
