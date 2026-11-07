import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NumericModule } from "./NumericModule";
import { NUMERIC_SEEDS, NUMERIC_WORST_CASE } from "@dashhaus/core/seeds/numeric";
import type { NumericSeed } from "@dashhaus/core/seeds/numeric";

/*
 * What every field module does, whatever it is: unavailable blanks the screen (spec/field.md → Unavailable); a reading
 * has no keys. The frame (footprints, details) is ModuleFrame's, tested in shared/ui.test.tsx; test what this numeric
 * itself does here.
 */
const draw = (seed: keyof typeof NUMERIC_SEEDS | NumericSeed, footprint?: "compact" | "standard") => {
  const s = typeof seed === "string" ? NUMERIC_SEEDS[seed] : seed;
  return render(<NumericModule entity={s.entity} history={s.history} footprint={footprint} />).container;
};

describe("NumericModule", () => {
  it("is a reading: no keys, its glyph on a flat plate", () => {
    const container = draw("co2");
    expect(container.querySelectorAll(".fd-key")).toHaveLength(0);
    expect(container.querySelector(".fd-glyph")).not.toBeNull();
  });

  it("says the figure in five places, its leading ones unlit, its unit after it, and what it measures", () => {
    const container = draw("co2");
    expect(container.querySelector(".fd-digits")?.textContent).toBe("650");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("00");
    expect(screen.getByText("650 ppm")).toBeTruthy();
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^CO₂/);
  });

  it("scales a huge figure to fit, heard in full, and keeps a negative one's sign", () => {
    const huge = draw(NUMERIC_WORST_CASE[0]);
    expect(draw(NUMERIC_WORST_CASE[1]).querySelector(".fd-digits")?.textContent).toBe("1.2M");
    expect(huge.querySelector(".fd-digits")?.textContent).toBe("12346");
    expect(screen.getByText("12346 kWh")).toBeTruthy();
    expect(screen.getByText("1234568 L")).toBeTruthy();
    expect(draw("export").querySelector(".fd-digits")?.textContent).toBe("-1240");
  });

  it("says today's low and high over the meter, or a meter's rise, on a standard module", () => {
    expect(draw("co2").textContent).toContain("470–940");
    expect(draw("energy").textContent).toContain("+8.6");
  });

  it("blanks the screen while there is no reading yet, and says so", () => {
    const container = draw("waiting");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("-----");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^No reading yet/);
  });

  it("blanks the screen while unavailable and says when it was last seen", () => {
    const container = draw("unavailable");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("-----");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
    expect(container.querySelector(".fd-meta")?.textContent).toContain("Seen 08:20");
  });

  it("leads a compact row with a reading's glyph", () => {
    expect(draw("co2", "compact").querySelector(".fd-module > .fd-glyph")).not.toBeNull();
  });
});
