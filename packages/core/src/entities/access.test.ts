/**
 * A door or gate left open (spec/cards.md → What every card says → A door or gate left open): an access point that is
 * normally closed and that the dashboard can close warns when left open, as a cover or as the contact sensor that is
 * the same door; a plain door contact stays a state. This holds the cover's and the binary sensor's models to it.
 */
import { describe, expect, it } from "vitest";
import { ON_SEVERITY } from "./binarySensor/severity";
import type { BinarySensorClass } from "./binarySensor/types";
import { CLASS_LABEL, isAccess } from "./cover/position";
import type { CoverClass } from "./cover/types";

/** A cover class's binary sensor twin: the class a contact sensor on that same thing has, where there is one. */
const TWIN: Partial<Record<CoverClass, BinarySensorClass>> = { garage: "garage_door" };

const access = (Object.keys(CLASS_LABEL) as CoverClass[]).filter(isAccess);

describe("a door or gate left open", () => {
  it("warns on a garage door, a gate and a door, and on no cover that lets in light", () => {
    expect(access).toEqual(["garage", "door", "gate"]);
  });

  it("warns as advisory on the binary sensor of every class isAccess warns on, where the binary sensor has that class", () => {
    for (const cls of access) {
      const twin = TWIN[cls];
      if (twin) expect(ON_SEVERITY[twin], `${cls} → ${twin}`).toBe("advisory");
    }
    expect(Object.values(TWIN).length).toBeGreaterThan(0);
  });

  it("leaves a plain door contact, an opening and a window a state", () => {
    for (const cls of ["door", "opening", "window"] as const) expect(ON_SEVERITY[cls], cls).toBeUndefined();
  });

  it("warns of nothing left open on a binary sensor that isn't a cover's twin", () => {
    const twins = new Set<string>(Object.values(TWIN));
    const leftOpen = (["door", "garage_door", "opening", "window"] as const).filter((cls) => ON_SEVERITY[cls]);
    expect(leftOpen.every((cls) => twins.has(cls))).toBe(true);
  });
});
