import { describe, expect, it } from "vitest";
import { generateSkinDashboard, generateSkinView } from "@dashhaus/core/lovelace";
import { CARD_TYPE, createDashhausCard, ORB_STRATEGY } from "./card";

describe("Orb's dashboard strategy", () => {
  it("is custom:orb-dashboard, listed as Orb, on Orb's own card and page", () => {
    expect(ORB_STRATEGY.type).toBe("orb-dashboard");
    expect(ORB_STRATEGY.name).toBe("Orb");
    expect(ORB_STRATEGY.card).toBe(`custom:${CARD_TYPE}`);
    expect(ORB_STRATEGY.documentationURL).toBe("https://krystosterone.github.io/dashhaus/orb/");
    expect(JSON.stringify(ORB_STRATEGY), "nothing a skin's resource lists is named Dashhaus").not.toMatch(/Dashhaus/);
  });

  it("emits cards Orb's own Lovelace card accepts", () => {
    customElements.define("strategy-test-orb", createDashhausCard(""));
    for (const config of [{ type: "custom:orb-dashboard" }, { type: "custom:orb-dashboard", title: "Flat", ...{ viewing: "far", theme: "dark" } }, { type: "custom:orb-dashboard", layout: "wall", viewing: "far" }]) {
      const [card] = generateSkinDashboard(ORB_STRATEGY, config).views[0].cards;
      expect(generateSkinView(ORB_STRATEGY, config).cards[0]).toEqual(card);
      const element = document.createElement("strategy-test-orb") as HTMLElement & { setConfig(raw: unknown): void };
      expect(() => element.setConfig(card), JSON.stringify(card)).not.toThrow();
    }
  });
});
