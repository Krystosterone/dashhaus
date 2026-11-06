import { afterEach, describe, expect, it } from "vitest";
import { dashboardStrategyTag, defineSkinStrategy, generateSkinDashboard, generateSkinView, strategyEntry, viewStrategyTag } from "./strategy";
import type { SkinStrategy } from "./strategy";

type Element = { generate(config: unknown, hass: unknown): Promise<Record<string, unknown>>; shouldRegenerate?: () => boolean; getCreateSuggestions?: () => unknown };

const CANVAS: SkinStrategy = {
  type: "canvas-dashboard",
  name: "Canvas",
  description: "Every light by room.",
  documentationURL: "https://example.com/canvas/",
  icon: "mdi:palette",
  card: "custom:canvas-card",
  options: ["viewing"],
};

/** How the frontend resolves a `custom:<name>` strategy (`get-strategy.ts`): the element `ll-strategy-<kind>-<name>`. */
const element = (kind: "dashboard" | "view", type: string) => customElements.get(`ll-strategy-${kind}-${type.slice("custom:".length)}`) as unknown as Element;

describe("a skin's dashboard strategy", () => {
  defineSkinStrategy(CANVAS);

  afterEach(() => {
    window.customStrategies = window.customStrategies?.filter((entry) => entry.type === CANVAS.type);
  });

  it("defines the elements the frontend looks for, and lists the skin by its own name in Add dashboard", () => {
    expect(dashboardStrategyTag(CANVAS)).toBe("ll-strategy-dashboard-canvas-dashboard");
    expect(viewStrategyTag(CANVAS)).toBe("ll-strategy-view-canvas-dashboard");
    expect(customElements.get(dashboardStrategyTag(CANVAS))).toBeDefined();
    expect(customElements.get(viewStrategyTag(CANVAS))).toBeDefined();
    // The dialog prefixes `custom:` itself and saves `{ strategy: { type: "custom:canvas-dashboard" } }`.
    expect(window.customStrategies).toEqual([
      { type: "canvas-dashboard", strategyType: "dashboard", name: "Canvas", description: "Every light by room.", documentationURL: "https://example.com/canvas/" },
    ]);
  });

  it("is safe to define twice, and keeps what another resource listed before it", () => {
    window.customStrategies = [{ type: "someone-else", strategyType: "dashboard" }, ...(window.customStrategies ?? [])];
    expect(() => defineSkinStrategy(CANVAS)).not.toThrow();
    expect(window.customStrategies.map((entry) => entry.type)).toEqual(["someone-else", "canvas-dashboard"]);
  });

  it("suggests the skin's name and icon for the create dialog, and never regenerates as the house changes", () => {
    const dashboard = element("dashboard", "custom:canvas-dashboard");
    expect(dashboard.getCreateSuggestions?.()).toEqual({ title: "Canvas", icon: "mdi:palette" });
    expect(dashboard.shouldRegenerate?.()).toBe(false);
    expect(element("view", "custom:canvas-dashboard").shouldRegenerate?.()).toBe(false);
  });

  it("with the dialog's bare config, draws one panel holding the skin's card on its automatic layout", async () => {
    expect(await element("dashboard", "custom:canvas-dashboard").generate({ type: "custom:canvas-dashboard" }, {})).toEqual({
      views: [{ title: "Canvas", path: "home", type: "panel", cards: [{ type: "custom:canvas-card", title: "Home" }] }],
    });
  });

  it("hands the card its title and the options the skin names, and works as a view of any dashboard", async () => {
    expect(generateSkinDashboard(CANVAS, { type: "custom:canvas-dashboard", title: "Flat", viewing: "far" }).views[0].cards)
      .toEqual([{ type: "custom:canvas-card", title: "Flat", viewing: "far" }]);
    expect(await element("view", "custom:canvas-dashboard").generate({ type: "custom:canvas-dashboard", viewing: "near" }, {}))
      .toEqual({ type: "panel", cards: [{ type: "custom:canvas-card", title: "Home", viewing: "near" }] });
  });

  it("refuses what it can't use, in the skin's name, in words the frontend shows in place of the dashboard", () => {
    expect(() => generateSkinDashboard(CANVAS, { type: "custom:canvas-dashboard", theme: "dark" })).toThrow(/^Canvas: unknown key "theme". The strategy takes title, viewing.$/);
    expect(() => generateSkinView(CANVAS, { type: "custom:canvas-dashboard", viewing: true })).toThrow(/Canvas: "viewing" must be text/);
    expect(() => generateSkinDashboard(CANVAS, null)).toThrow(/Canvas: the strategy's config must be a mapping/);
  });

  it("leaves out a documentation link and suggests a plain icon when the skin names neither", () => {
    const bare = { type: "bare", name: "Bare", description: "A skin.", card: "custom:bare" };
    expect(strategyEntry(bare)).toEqual({ type: "bare", strategyType: "dashboard", name: "Bare", description: "A skin." });
    expect(generateSkinDashboard(bare, { type: "custom:bare" }).views[0].cards).toEqual([{ type: "custom:bare", title: "Home" }]);
  });
});
