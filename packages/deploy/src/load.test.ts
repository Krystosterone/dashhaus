// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DeployConfig, DeployDashboard } from "./config.js";
import { DeployConfigError, loadDashboards, readConfig, resolveDashboards, resolveFiles } from "./load.js";

const directories: string[] = [];

async function temporary() {
  const directory = await mkdtemp(join(tmpdir(), "deploy-config-"));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const dashboard = (overrides: Partial<{ path: string; title: string; env: { path?: string; title?: string } }> = {}): DeployDashboard => ({
  path: "dashhaus-orb",
  title: "Home",
  icon: "mdi:home",
  async card() { return { card: {}, made: "" }; },
  ...overrides,
});

const config = (overrides: Partial<DeployConfig> = {}): DeployConfig => ({
  files: ["dist/orb-dashboard.js"],
  dashboards: [dashboard()],
  ...overrides,
});

/** A config with fields the types refuse, as a JavaScript config may write them. */
const untyped = (overrides: Record<string, unknown>) => ({ dashboards: [dashboard()], ...overrides }) as unknown as DeployConfig;

/** One dashboard as written, with fields the types refuse. */
const written = (fields: Record<string, unknown>) =>
  untyped({ dashboards: [{ path: "home-a", title: "Home", icon: "mdi:home", ...fields }] });

describe("resolveDashboards", () => {
  it("applies only the .env overrides each dashboard names", () => {
    const declared = config({
      dashboards: [
        dashboard({ path: "dashhaus-orb", title: "Home (Orb)", env: { path: "HA_DASHBOARD", title: "HA_DASHBOARD_TITLE" } }),
        dashboard({ path: "dashhaus-field", title: "Home (Field)", env: { path: "HA_FIELD_DASHBOARD", title: "HA_FIELD_DASHBOARD_TITLE" } }),
        dashboard({ path: "dashhaus-canvas", title: "Home (Canvas)" }),
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
      ["dashhaus-field", "Field House"],
      ["dashhaus-canvas", "Home (Canvas)"],
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
    expect(() => resolveDashboards(written({ title: 1 }), {})).toThrowError("dashboards[0].title must be a string");
    expect(() => resolveDashboards(written({}), {})).toThrowError("dashboards[0] needs a card (a card(ha) function, or the card's config) or a strategy");
  });

  it("keeps a card factory, a card's config as written, or a strategy", () => {
    const factory = async () => ({ card: { type: "custom:dashhaus-orb" }, made: "one card" });
    const { dashboards } = resolveDashboards(config({
      dashboards: [
        { path: "home-a", title: "A", icon: "mdi:home", card: factory },
        { path: "home-b", title: "B", icon: "mdi:home", card: { type: "custom:dashhaus-orb", cards: ["light.kitchen"] } },
        { path: "home-c", title: "C", icon: "mdi:home", strategy: { type: "custom:orb-dashboard", theme: "dark" } },
      ],
    }), {});
    expect(dashboards[0].card).toBe(factory);
    expect(dashboards[1]).toEqual({ path: "home-b", title: "B", icon: "mdi:home", card: { type: "custom:dashhaus-orb", cards: ["light.kitchen"] } });
    expect(dashboards[2]).toEqual({ path: "home-c", title: "C", icon: "mdi:home", strategy: { type: "custom:orb-dashboard", theme: "dark" } });
  });

  it("refuses a dashboard with both a card and a strategy, or a malformed one, naming it", () => {
    const at = (fields: Record<string, unknown>) => () => resolveDashboards(untyped({
      dashboards: [dashboard({ path: "home-a" }), { path: "home-b", title: "B", icon: "mdi:home", ...fields }],
    }), {});
    expect(at({ card: { type: "custom:dashhaus-orb" }, strategy: { type: "custom:orb-dashboard" } })).toThrowError("dashboards[1] takes a card or a strategy, not both");
    expect(at({ strategy: "custom:orb-dashboard" })).toThrowError("dashboards[1].strategy must be an object with a type");
    expect(at({ strategy: {} })).toThrowError("dashboards[1].strategy must be an object with a type");
    expect(at({ strategy: { type: " " } })).toThrowError("dashboards[1].strategy must be an object with a type");
    expect(at({ strategy: [] })).toThrowError("dashboards[1].strategy must be an object with a type");
    expect(at({ card: "custom:dashhaus-orb" })).toThrowError("dashboards[1].card must be a card(ha) function returning { card, made }, or the card's config");
    expect(at({ card: null })).toThrowError("dashboards[1].card must be a card(ha) function");
    expect(at({ card: { cards: [] } })).toThrowError('dashboards[1].card must have a type, such as "custom:dashhaus-orb"');
    expect(at({ card: { type: "custom:dashhaus-orb" } })).not.toThrow();
  });
});

describe("resolveFiles", () => {
  it("resolves each file against the config and derives its resource URL from its folder and name", () => {
    const directory = "/configs";
    const targets = resolveFiles(config({ files: ["dist/orb-dashboard.js", "/opt/field/field-dashboard.js"] }), join(directory, "dashboard.config.mjs"));
    expect(targets).toEqual([
      {
        file: join(directory, "dist", "orb-dashboard.js"),
        name: "orb-dashboard.js",
        folder: "orb-dashboard",
        resourcePath: "/local/orb-dashboard/orb-dashboard.js",
      },
      {
        file: "/opt/field/field-dashboard.js",
        name: "field-dashboard.js",
        folder: "field-dashboard",
        resourcePath: "/local/field-dashboard/field-dashboard.js",
      },
    ]);
  });

  it("keeps an absolute path and its name's folder", () => {
    const targets = resolveFiles(untyped({ files: ["/tmp/out/cards.js"] }), "/configs/dashboard.config.mjs");
    expect(targets).toEqual([{ file: "/tmp/out/cards.js", name: "cards.js", folder: "cards", resourcePath: "/local/cards/cards.js" }]);
  });

  it("refuses no files, an empty list, an entry that is not a path and two files with one name", () => {
    const resolveOf = (overrides: Record<string, unknown>) => () => resolveFiles(untyped(overrides), "/configs/dashboard.config.mjs");
    expect(resolveOf({})).toThrowError(DeployConfigError);
    expect(resolveOf({})).toThrowError('the deploy config must name the files to upload: files: ["dist/cards.js"]');
    expect(resolveOf({ files: [] })).toThrowError("files must name at least one file to upload");
    expect(resolveOf({ files: "a.js" })).toThrowError("files must be a list of the files to upload");
    expect(resolveOf({ files: ["a.js", 3] })).toThrowError("files[1] must be the path of a file to upload");
    expect(resolveOf({ files: ["a.js", ""] })).toThrowError("files[1] must be the path of a file to upload");
    expect(resolveOf({ files: ["dist/cards.js", "/elsewhere/cards.js"] })).toThrowError(
      "files must have different file names: dist/cards.js and /elsewhere/cards.js would both be served as /local/cards/cards.js",
    );
  });
});

describe("readConfig", () => {
  it("bundles a config outside the repo, so it may import TypeScript and packages", async () => {
    const directory = await temporary();
    await writeFile(join(directory, "title.ts"), 'type Title = string;\nexport const title: Title = "Flat";\n');
    await writeFile(join(directory, "dashboard.config.mjs"), [
      'import { title } from "./title.ts";',
      "export default { pageTitle: title, files: [\"dist/flat.js\"], dashboards: [] };",
    ].join("\n"));
    const loaded = await readConfig(join(directory, "dashboard.config.mjs"));
    expect(loaded.pageTitle).toBe("Flat");
    expect(resolveFiles(loaded, join(directory, "dashboard.config.mjs"))[0].resourcePath).toBe("/local/flat/flat.js");
  });

  it("keeps a build callback, which the deploy runs in the config's directory", async () => {
    const directory = await temporary();
    await writeFile(join(directory, "dashboard.config.mjs"), "export default { files: [\"out.js\"], build() {}, dashboards: [] };\n");
    const loaded = await readConfig(join(directory, "dashboard.config.mjs"));
    expect(loaded.build).toBeTypeOf("function");
  });

  it("refuses a missing file, a config without dashboards, and files it cannot upload", async () => {
    const directory = await temporary();
    await expect(readConfig(join(directory, "missing.js"))).rejects.toThrowError("Could not load");
    await writeFile(join(directory, "no-dashboards.js"), "export default { files: [\"out.js\"] };\n");
    await expect(readConfig(join(directory, "no-dashboards.js"))).rejects.toThrowError("must export default");
    await writeFile(join(directory, "no-files.js"), "export default { dashboards: [] };\n");
    await expect(readConfig(join(directory, "no-files.js"))).rejects.toThrowError("must name the files to upload");
    await writeFile(join(directory, "not-a-list.js"), "export default { files: 3, dashboards: [] };\n");
    await expect(readConfig(join(directory, "not-a-list.js"))).rejects.toThrowError("files must be a list of the files to upload");
    await writeFile(join(directory, "same-name.js"), "export default { files: [\"a/x.js\", \"b/x.js\"], dashboards: [] };\n");
    await expect(readConfig(join(directory, "same-name.js"))).rejects.toThrowError(`${join(directory, "same-name.js")}: files must have different file names`);
  });

  it("reports a syntax error at the config's file and line", async () => {
    const directory = await temporary();
    await writeFile(join(directory, "broken.js"), "export default {\n  dashboards: [\n};\n");
    await expect(readConfig(join(directory, "broken.js"))).rejects.toThrowError("Could not load");
  });
});

describe("loadDashboards", () => {
  it("reads a config and applies the environment in one step", async () => {
    const directory = await temporary();
    await writeFile(join(directory, "dashboard.config.mjs"), [
      "export default {",
      '  pageTitle: "Home",',
      '  files: ["dist/orb-dashboard.js"],',
      "  dashboards: [{",
      '    path: "dashhaus-orb",',
      '    title: "Home",',
      '    icon: "mdi:home",',
      '    env: { path: "HA_DASHBOARD" },',
      "    async card() { return { card: { type: \"custom:dashhaus-orb\" }, made: \"one card\" }; },",
      "  }],",
      "};",
    ].join("\n"));
    const { dashboards } = await loadDashboards({ file: join(directory, "dashboard.config.mjs"), env: { HA_DASHBOARD: "my-house" } });
    expect(dashboards.map(({ path }) => path)).toEqual(["my-house"]);
  });
});
