import { describe, expect, it } from "vitest";
import { generateSkinDashboard, generateSkinView } from "@dashhaus/core/lovelace";
import { FIELD_CARD_TYPE, createFieldCard, FIELD_STRATEGY } from "./card";

describe("Field's dashboard strategy", () => {
  it("is custom:field-dashboard, listed as Field, on Field's own card and page", () => {
    expect(FIELD_STRATEGY.type).toBe("field-dashboard");
    expect(FIELD_STRATEGY.name).toBe("Field");
    expect(FIELD_STRATEGY.card).toBe(`custom:${FIELD_CARD_TYPE}`);
    expect(FIELD_STRATEGY.documentationURL).toBe("https://krystosterone.github.io/dashhaus/field/");
    expect(JSON.stringify(FIELD_STRATEGY), "nothing a skin's resource lists is named Dashhaus").not.toMatch(/Dashhaus/);
  });

  it("emits cards Field's own Lovelace card accepts", () => {
    customElements.define("strategy-test-field", createFieldCard(""));
    for (const config of [{ type: "custom:field-dashboard" }, { type: "custom:field-dashboard", title: "Flat", ...{ viewing: "far", finish: "black" } }, { type: "custom:field-dashboard", layout: "wall", viewing: "far" }]) {
      const [card] = generateSkinDashboard(FIELD_STRATEGY, config).views[0].cards;
      expect(generateSkinView(FIELD_STRATEGY, config).cards[0]).toEqual(card);
      const element = document.createElement("strategy-test-field") as HTMLElement & { setConfig(raw: unknown): void };
      expect(() => element.setConfig(card), JSON.stringify(card)).not.toThrow();
    }
  });
});
