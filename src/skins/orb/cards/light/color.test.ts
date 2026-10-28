import { describe, expect, it } from "vitest";
import { LAMP_COLORS, lampColorOf } from "./color";

describe("orb's lamp colours", () => {
  it("give every named colour a swatch", () => {
    for (const color of LAMP_COLORS) expect(color.swatch).toBeDefined();
  });

  it("carry the swatch through lampColorOf", () => {
    expect(lampColorOf([31.086, 94.488])).toMatchObject({ name: "Amber", swatch: { c: 0.17, h: 62 } });
  });
});
