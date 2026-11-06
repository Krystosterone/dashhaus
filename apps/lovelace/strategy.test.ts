import { afterEach, describe, expect, it } from "vitest";
import { createDashhausCard } from "@dashhaus/orb/lovelace/card";
import { createFieldCard } from "@dashhaus/field/lovelace/card";
import { STRATEGY_LOOKS } from "./dashboards";
import {
  DASHBOARD_ENTRY,
  DASHBOARD_STRATEGY_TAG,
  VIEW_STRATEGY_TAG,
  chosenLooks,
  defineStrategies,
  generateDashboard,
  generateView,
  sunsetNotice,
} from "./strategy";

type Strategy = { generate(config: unknown, hass: unknown): Promise<Record<string, unknown>>; shouldRegenerate?: () => boolean; getCreateSuggestions?: () => unknown };

/**
 * How the frontend resolves a strategy (`get-strategy.ts`): a `custom:<name>` dashboard strategy is the element
 * `ll-strategy-dashboard-<name>`, a view strategy `ll-strategy-view-<name>`, and a view's generated keys are merged
 * over its own (`{ ...base, ...generated }`), after the dashboard's strategy has made the views.
 */
async function expand(config: { strategy: { type: string } & Record<string, unknown> }) {
  const element = (kind: "dashboard" | "view", type: string) => {
    expect(type.startsWith("custom:"), `${type} must be a custom strategy`).toBe(true);
    const found = customElements.get(`ll-strategy-${kind}-${type.slice("custom:".length)}`);
    expect(found, `no ${kind} strategy element for ${type}`).toBeDefined();
    return found as unknown as Strategy;
  };
  const dashboard = (await element("dashboard", config.strategy.type).generate(config.strategy, {})) as { views: Record<string, unknown>[] };
  return Promise.all(dashboard.views.map(async ({ strategy, ...base }) => {
    const view = strategy as { type: string };
    return { ...base, ...(await element("view", view.type).generate(view, {})) } as { title: string; path: string; type: string; cards: Stack[] };
  }));
}

type Stack = { type: string; cards: Record<string, unknown>[] };
/** Each view holds one stack: the sunset notice, then the look's card. */
const lookCard = (view: { cards: Stack[] }) => view.cards[0].cards[1];

describe("the custom:dashhaus strategy, in the combined install's last release", () => {
  defineStrategies();

  afterEach(() => {
    window.customStrategies = window.customStrategies?.filter((entry) => entry.type === DASHBOARD_ENTRY.type);
  });

  it("defines the elements the frontend looks for, and lists the dashboard in the Add dashboard dialog", () => {
    expect(customElements.get(DASHBOARD_STRATEGY_TAG)).toBeDefined();
    expect(customElements.get(VIEW_STRATEGY_TAG)).toBeDefined();
    expect(DASHBOARD_STRATEGY_TAG).toBe("ll-strategy-dashboard-dashhaus");
    expect(VIEW_STRATEGY_TAG).toBe("ll-strategy-view-dashhaus");
    // The dialog prefixes `custom:` itself and saves `{ strategy: { type: "custom:dashhaus" } }`.
    expect(window.customStrategies).toEqual([
      { type: "dashhaus", strategyType: "dashboard", name: "Dashhaus", description: expect.any(String), documentationURL: expect.stringMatching(/^https:\/\//) },
    ]);
  });

  it("is safe to define twice: one entry, no redefinition", () => {
    expect(() => defineStrategies()).not.toThrow();
    expect(window.customStrategies?.filter((entry) => entry.type === "dashhaus")).toHaveLength(1);
  });

  it("keeps an entry another resource listed before it", () => {
    window.customStrategies = [{ type: "someone-else", strategyType: "dashboard" }];
    defineStrategies();
    expect(window.customStrategies.map((entry) => entry.type)).toEqual(["someone-else", "dashhaus"]);
  });

  it("suggests a title and icon for the create dialog, and never regenerates as the house changes", () => {
    const dashboard = customElements.get(DASHBOARD_STRATEGY_TAG) as unknown as Strategy;
    expect(dashboard.getCreateSuggestions?.()).toEqual({ title: "Dashhaus", icon: "mdi:home-variant" });
    expect(dashboard.shouldRegenerate?.()).toBe(false);
    expect((customElements.get(VIEW_STRATEGY_TAG) as unknown as Strategy).shouldRegenerate?.()).toBe(false);
  });

  it("with the dialog's bare config, draws every look: one panel view each, on its automatic layout", async () => {
    const views = await expand({ strategy: { type: "custom:dashhaus" } });
    expect(views.map((view) => view.path)).toEqual(STRATEGY_LOOKS.map((look) => look.id));
    expect(views[0]).toEqual({ title: "Orb", path: "orb", type: "panel", cards: [{ type: "vertical-stack", cards: [sunsetNotice(STRATEGY_LOOKS[0]), { type: "custom:dashhaus-orb", title: "Home" }] }] });
    expect(views[1]).toEqual({ title: "Field", path: "field", type: "panel", cards: [{ type: "vertical-stack", cards: [sunsetNotice(STRATEGY_LOOKS[1]), { type: "custom:dashhaus-field", title: "Home" }] }] });
    // One stack per view: the notice, then the skin's Lovelace card, with no cards or rows.
    expect(views.map(lookCard).map((card) => card.type)).toEqual(STRATEGY_LOOKS.map((look) => look.type));
  });

  it("tells each view's reader that its look now installs on its own, and where to start", () => {
    for (const look of STRATEGY_LOOKS) {
      const notice = sunsetNotice(look);
      expect(notice.type, "Home Assistant's own Markdown card, so the notice needs nothing from a skin").toBe("markdown");
      expect(notice.content).toContain(`**${look.name} now installs on its own.**`);
      expect(notice.content).toContain(`(https://krystosterone.github.io/dashhaus/${look.id}/)`);
      expect(notice.content).toMatch(/Add dashboard.*remove Dashhaus/);
    }
    expect(DASHBOARD_ENTRY.description).toMatch(/^Orb and Field now install on their own/);
  });

  it("draws only the looks `skin` names, in its order", async () => {
    expect((await expand({ strategy: { type: "custom:dashhaus", skin: "field" } })).map((view) => view.path)).toEqual(["field"]);
    expect((await expand({ strategy: { type: "custom:dashhaus", skin: ["field", "orb"] } })).map((view) => view.path)).toEqual(["field", "orb"]);
  });

  it("hands each card the settings it takes: viewing to both, theme to orb, finish to field", async () => {
    const views = await expand({ strategy: { type: "custom:dashhaus", title: "Flat", viewing: "far", theme: "dark", finish: "black" } });
    expect(lookCard(views[0])).toEqual({ type: "custom:dashhaus-orb", title: "Flat", viewing: "far", theme: "dark" });
    expect(lookCard(views[1])).toEqual({ type: "custom:dashhaus-field", title: "Flat", viewing: "far", finish: "black" });
  });

  it("emits cards the skins' own Lovelace cards accept", async () => {
    customElements.define("strategy-test-orb", createDashhausCard(""));
    customElements.define("strategy-test-field", createFieldCard(""));
    const make = { "custom:dashhaus-orb": "strategy-test-orb", "custom:dashhaus-field": "strategy-test-field" } as Record<string, string>;
    for (const strategy of [{ type: "custom:dashhaus" }, { type: "custom:dashhaus", title: "Flat", viewing: "far", theme: "light", finish: "alloy" }]) {
      for (const view of await expand({ strategy })) {
        const card = lookCard(view);
        const element = document.createElement(make[card.type as string]) as HTMLElement & { setConfig(raw: unknown): void };
        expect(() => element.setConfig(card), `${card.type} refused ${JSON.stringify(card)}`).not.toThrow();
      }
    }
    // The check bites: field's card refuses orb's theme key, which is why the strategy hands it only to orb.
    const field = document.createElement("strategy-test-field") as HTMLElement & { setConfig(raw: unknown): void };
    expect(() => field.setConfig({ type: "custom:dashhaus-field", theme: "dark" })).toThrow();
  });

  it("works as a view of its own in any dashboard, orb by default", () => {
    expect(lookCard(generateView({ type: "custom:dashhaus" }))).toEqual({ type: "custom:dashhaus-orb", title: "Home" });
    expect(lookCard(generateView({ type: "custom:dashhaus", skin: "field", viewing: "far" }))).toEqual({ type: "custom:dashhaus-field", title: "Home", viewing: "far" });
  });

  it("refuses what it can't use, in words the frontend shows in place of the dashboard", () => {
    expect(() => generateDashboard({ type: "custom:dashhaus", skin: "canvas" })).toThrow(/Dashhaus: there is no look "canvas". Choose from orb, field/);
    expect(() => generateDashboard({ type: "custom:dashhaus", skin: [] })).toThrow(/lists no look/);
    expect(() => generateDashboard({ type: "custom:dashhaus", skin: ["orb", "orb"] })).toThrow(/"orb" twice/);
    expect(() => generateDashboard({ type: "custom:dashhaus", skin: 3 })).toThrow(/"skin" must be one look or a list/);
    expect(() => generateDashboard({ type: "custom:dashhaus", layout: "phone" })).toThrow(/unknown key "layout"/);
    expect(() => generateDashboard({ type: "custom:dashhaus", viewing: true })).toThrow(/"viewing" must be text/);
    expect(() => generateView({ type: "custom:dashhaus", skin: ["orb", "field"] })).toThrow(/a view draws one look/);
    expect(() => generateDashboard(null)).toThrow(/must be a mapping/);
  });

  it("offers a skin npm run new-skin registers, by its name, with only a title", () => {
    const canvas = { id: "canvas", name: "Canvas", type: "custom:dashhaus-canvas", passes: [] } as const;
    const looks = [...STRATEGY_LOOKS, canvas];
    expect(chosenLooks({ skin: "canvas" }, looks)).toEqual([canvas]);
    expect(lookCard(generateView({ type: "custom:dashhaus", skin: "canvas", viewing: "far" }, looks))).toEqual({ type: "custom:dashhaus-canvas", title: "Home" });
  });
});
