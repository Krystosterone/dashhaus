import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DeployConfigError, generatedDashboards, loadDashboards, panelView, resolveDashboards } from "./config.mjs";
import type { DeployConfig, DeployDashboard, DeployHa } from "./config.mjs";
import { GENERATED_SKINS } from "../generated-skins.mjs";

const CONFIG_FILE = join(process.cwd(), "dashboard.config.mjs");

const dashboard = (overrides: Partial<DeployDashboard> = {}): DeployDashboard => ({
  path: "home-dashboard",
  title: "Home",
  icon: "mdi:home",
  async card() { return { card: {}, made: "" }; },
  ...overrides,
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

describe("resolveDashboards", () => {
  it("applies only the .env overrides each dashboard names", () => {
    const config: DeployConfig = {
      dashboards: [
        dashboard({ path: "home-dashboard", title: "Home (Orb)", env: { path: "HA_DASHBOARD", title: "HA_DASHBOARD_TITLE" } }),
        dashboard({ path: "home-dashboard-field", title: "Home (Field)", env: { path: "HA_FIELD_DASHBOARD", title: "HA_FIELD_DASHBOARD_TITLE" } }),
        ...generatedDashboards([{ id: "canvas", title: "Home (Canvas)", icon: "mdi:view-dashboard-outline" }]),
      ],
    };
    const { dashboards, pageTitle } = resolveDashboards(config, {
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
    const config = { dashboards: [dashboard({ path: "home" })] };
    expect(() => resolveDashboards(config, {})).toThrowError(DeployConfigError);
    expect(() => resolveDashboards(config, {})).toThrowError('dashboard paths must contain a hyphen (Home Assistant requires it): "home"');
  });

  it("refuses two dashboards on one path, including one the .env overrides make", () => {
    const duplicate = { dashboards: [dashboard({ path: "home-a" }), dashboard({ path: "home-a" })] };
    expect(() => resolveDashboards(duplicate, {})).toThrowError("dashboard paths must be unique: home-a");
    const overridden: DeployConfig = {
      dashboards: [
        dashboard({ path: "home-orb", env: { path: "HA_DASHBOARD" } }),
        dashboard({ path: "home-field" }),
      ],
    };
    expect(() => resolveDashboards(overridden, { HA_DASHBOARD: "home-field" })).toThrowError("dashboard paths must be unique: home-field");
  });

  it("requires the fields deploy reads", () => {
    const noCard = { dashboards: [{ path: "home-a", title: "Home", icon: "mdi:home" }] } as unknown as DeployConfig;
    expect(() => resolveDashboards(noCard, {})).toThrowError("dashboards[0].card must be a function");
  });
});

describe("panelView", () => {
  it("puts the card in one panel view, so it gets the full width", () => {
    const card = { type: "custom:home-dashboard" };
    expect(panelView(card, "Flat")).toEqual({ views: [{ title: "Flat", path: "home", type: "panel", cards: [card] }] });
  });
});

describe("generatedDashboards", () => {
  it("registers a generated skin at its own path with its own card", async () => {
    const [canvas] = generatedDashboards([{ id: "canvas", title: "Home (Canvas)", icon: "mdi:view-dashboard-outline" }]);
    expect(canvas).toMatchObject({ path: "home-dashboard-canvas", title: "Home (Canvas)", icon: "mdi:view-dashboard-outline" });
    expect(await canvas.card()).toEqual({
      card: { type: "custom:home-dashboard-canvas", title: "Home" },
      made: "the canvas skin's automatic layout",
    });
  });
});

describe("the repo's dashboard config", () => {
  it("loads Orb, Field and every generated skin without Home Assistant", async () => {
    const { dashboards, pageTitle } = await loadDashboards({ file: CONFIG_FILE, env: {} });
    expect(pageTitle).toBe("Home");
    expect(dashboards.map(({ path, title, icon }) => ({ path, title, icon }))).toEqual([
      { path: "home-dashboard", title: "Home (Orb)", icon: "mdi:home-variant" },
      { path: "home-dashboard-field", title: "Home (Field)", icon: "mdi:knob" },
      ...GENERATED_SKINS.map(({ id, title, icon }) => ({ path: `home-dashboard-${id}`, title, icon })),
    ]);
  });

  it("draws Orb from a house and Field from its own automatic layout", async () => {
    const { dashboards } = await loadDashboards({ file: CONFIG_FILE, env: {} });
    const orb = dashboards.find(({ path }) => path === "home-dashboard")!;
    const field = dashboards.find(({ path }) => path === "home-dashboard-field")!;
    expect(await orb.card(fakeHa)).toEqual({
      card: {
        type: "custom:home-dashboard",
        title: "Home",
        sections: [{ title: "Other", cards: [{ entity: "light.bed", footprint: "compact" }] }],
      },
      made: "1 generated sections",
    });
    expect(await field.card()).toEqual({
      card: { type: "custom:home-dashboard-field", title: "Home" },
      made: "every light and climate entity by area",
    });
  });
});
