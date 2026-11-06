import { afterEach, describe, expect, it } from "vitest";
import { createDashhausCard } from "@dashhaus/orb/lovelace/card";
import { createFieldCard } from "@dashhaus/field/lovelace/card";
import { registerCard } from "@dashhaus/dashboard";
import { SKIN_REPOSITORIES } from "../../scripts/skin-repositories.js";
import { STRATEGY_LOOKS } from "./dashboards";
import { PICKER, SKIN_STRATEGIES, defineSkin } from "./skins";
import {
  DASHBOARD_ENTRY,
  DASHHAUS,
  DASHBOARD_STRATEGY_TAG,
  VIEW_STRATEGY_TAG,
  chosenLooks,
  defineStrategies,
  generateDashboard,
  generateView,
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
    return { ...base, ...(await element("view", view.type).generate(view, {})) } as { title: string; path: string; type: string; cards: Record<string, unknown>[] };
  }));
}

describe("the custom:dashhaus strategy", () => {
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
    expect(views[0]).toEqual({ title: "Orb", path: "orb", type: "panel", cards: [{ type: "custom:dashhaus-orb", title: "Home" }] });
    expect(views[1]).toEqual({ title: "Field", path: "field", type: "panel", cards: [{ type: "custom:dashhaus-field", title: "Home" }] });
    // One card per view, the skin's Lovelace card, with no cards or rows.
    expect(views.map((view) => view.cards[0].type)).toEqual(STRATEGY_LOOKS.map((look) => look.type));
  });

  it("draws only the looks `skin` names, in its order", async () => {
    expect((await expand({ strategy: { type: "custom:dashhaus", skin: "field" } })).map((view) => view.path)).toEqual(["field"]);
    expect((await expand({ strategy: { type: "custom:dashhaus", skin: ["field", "orb"] } })).map((view) => view.path)).toEqual(["field", "orb"]);
  });

  it("hands each card the settings it takes: viewing to both, theme to orb, finish to field", async () => {
    const views = await expand({ strategy: { type: "custom:dashhaus", title: "Flat", viewing: "far", theme: "dark", finish: "black" } });
    expect(views[0].cards).toEqual([{ type: "custom:dashhaus-orb", title: "Flat", viewing: "far", theme: "dark" }]);
    expect(views[1].cards).toEqual([{ type: "custom:dashhaus-field", title: "Flat", viewing: "far", finish: "black" }]);
  });

  it("emits cards the skins' own Lovelace cards accept", async () => {
    customElements.define("strategy-test-orb", createDashhausCard(""));
    customElements.define("strategy-test-field", createFieldCard(""));
    const make = { "custom:dashhaus-orb": "strategy-test-orb", "custom:dashhaus-field": "strategy-test-field" } as Record<string, string>;
    for (const strategy of [{ type: "custom:dashhaus" }, { type: "custom:dashhaus", title: "Flat", viewing: "far", theme: "light", finish: "alloy" }]) {
      for (const view of await expand({ strategy })) {
        const card = view.cards[0];
        const element = document.createElement(make[card.type as string]) as HTMLElement & { setConfig(raw: unknown): void };
        expect(() => element.setConfig(card), `${card.type} refused ${JSON.stringify(card)}`).not.toThrow();
      }
    }
    // The check bites: field's card refuses orb's theme key, which is why the strategy hands it only to orb.
    const field = document.createElement("strategy-test-field") as HTMLElement & { setConfig(raw: unknown): void };
    expect(() => field.setConfig({ type: "custom:dashhaus-field", theme: "dark" })).toThrow();
  });

  it("works as a view of its own in any dashboard, orb by default", () => {
    expect(generateView({ type: "custom:dashhaus" })).toEqual({ type: "panel", cards: [{ type: "custom:dashhaus-orb", title: "Home" }] });
    expect(generateView({ type: "custom:dashhaus", skin: "field", viewing: "far" })).toEqual({ type: "panel", cards: [{ type: "custom:dashhaus-field", title: "Home", viewing: "far" }] });
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
    const strategy = { ...DASHHAUS, looks: [...STRATEGY_LOOKS, canvas] };
    expect(chosenLooks({ skin: "canvas" }, strategy)).toEqual([canvas]);
    expect(generateView({ type: "custom:dashhaus", skin: "canvas", viewing: "far" }, strategy)).toEqual({ type: "panel", cards: [{ type: "custom:dashhaus-canvas", title: "Home" }] });
  });
});

describe("each skin's own strategy", () => {
  it("is the skin's repository's type, listed under the skin's name with its own page, and draws its one look", async () => {
    for (const entry of SKIN_REPOSITORIES) {
      const strategy = SKIN_STRATEGIES[entry.skin];
      defineStrategies(strategy);
      expect(strategy.type).toBe(entry.repository);
      expect(window.customStrategies?.find((listed) => listed.type === entry.repository)).toEqual({
        type: entry.repository,
        strategyType: "dashboard",
        name: entry.name,
        description: entry.description,
        documentationURL: `https://krystosterone.github.io/dashhaus/${entry.page}/`,
      });
      const dashboard = customElements.get(`ll-strategy-dashboard-${entry.repository}`) as unknown as Strategy;
      expect(dashboard.getCreateSuggestions?.()).toEqual({ title: entry.name, icon: entry.icon });
      const look = STRATEGY_LOOKS.find((candidate) => candidate.id === entry.skin)!;
      expect(await expand({ strategy: { type: `custom:${entry.repository}` } })).toEqual([
        { title: entry.name, path: entry.skin, type: "panel", cards: [{ type: look.type, title: "Home" }] },
      ]);
    }
  });

  it("takes only its own card's settings, and no skin, in words that name the skin", async () => {
    const orb = SKIN_STRATEGIES.orb;
    expect(generateDashboard({ type: "custom:orb-dashboard", title: "Flat", viewing: "far", theme: "dark" }, orb).views[0].strategy).toEqual({ type: "custom:orb-dashboard", title: "Flat", viewing: "far", theme: "dark" });
    expect(generateView({ type: "custom:orb-dashboard", viewing: "far", theme: "dark" }, orb)).toEqual({ type: "panel", cards: [{ type: "custom:dashhaus-orb", title: "Home", viewing: "far", theme: "dark" }] });
    expect(() => generateDashboard({ type: "custom:orb-dashboard", finish: "black" }, orb)).toThrow(/^Orb: unknown key "finish". The strategy takes title, viewing, theme\.$/);
    expect(() => generateDashboard({ type: "custom:orb-dashboard", skin: "field" }, orb)).toThrow(/^Orb: unknown key "skin"/);
    expect(() => generateView({ type: "custom:field-dashboard", theme: "dark" }, SKIN_STRATEGIES.field)).toThrow(/^Field: unknown key "theme". The strategy takes title, viewing, finish\.$/);
  });

  it("lists the skin's card under the skin's name when its own bundle defines it, and leaves another copy's entry alone", () => {
    const entry = SKIN_REPOSITORIES[0];
    window.customCards = [];
    defineSkin(entry, "skin-test-fresh", () => registerCard("skin-test-fresh", class extends HTMLElement {}, "Dashhaus", "old"));
    expect(window.customCards).toEqual([{ type: "skin-test-fresh", name: PICKER.orb.name, description: PICKER.orb.description, preview: false }]);
    defineSkin(entry, "skin-test-fresh", () => registerCard("skin-test-fresh", class extends HTMLElement {}, "Dashhaus", "old"));
    expect(window.customCards).toHaveLength(1);
    window.customCards = [{ type: "skin-test-other", name: "Dashhaus", description: "combined" }];
    customElements.define("skin-test-other", class extends HTMLElement {});
    defineSkin(entry, "skin-test-other", () => undefined);
    expect(window.customCards).toEqual([{ type: "skin-test-other", name: "Dashhaus", description: "combined" }]);
  });
});
