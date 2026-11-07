import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BinarySensorModule } from "./BinarySensorModule";
import { BINARY_SENSOR_SEEDS } from "@dashhaus/core/seeds/binarySensor";

/*
 * What every field module does, whatever it is: a reading has no keys, a lit pictogram says on, and unavailable
 * blanks the screen (spec/field.md → Unavailable). The frame (footprints, details) is ModuleFrame's, tested in
 * shared/ui.test.tsx; this tests what the binary sensor itself does.
 */
const draw = (seed: keyof typeof BINARY_SENSOR_SEEDS, footprint?: "compact" | "standard") =>
  render(<BinarySensorModule entity={BINARY_SENSOR_SEEDS[seed].entity} history={BINARY_SENSOR_SEEDS[seed].history} footprint={footprint} />).container;

describe("BinarySensorModule", () => {
  it("is a reading: no keys, its glyph on a flat plate", () => {
    const container = draw("closed");
    expect(container.querySelector(".fd-module .fd-key")).toBeNull();
    expect(container.querySelector(".fd-module .fd-glyph")).not.toBeNull();
  });

  it("says the state in its device class's words, short on the figure and whole on the meta line, its picture lit while on", () => {
    const closed = draw("closed");
    expect(closed.querySelector(".fd-read-fig")?.textContent).toBe("SHUTClosed");
    expect(closed.querySelector(".fd-meta")?.textContent).toMatch(/^ClosedSince 08:16/);
    expect(closed.querySelector(".fd-pict")?.getAttribute("data-lit")).toBe("false");
    const open = draw("open");
    expect(open.querySelector(".fd-read-fig")?.textContent).toBe("OPENOpen");
    expect(open.querySelector(".fd-pict")?.getAttribute("data-lit")).toBe("true");
  });

  it("keeps an open door a state, a leak urgent and smoke an alarm, on the screen", () => {
    expect(draw("open").querySelector(".fd-module")?.getAttribute("data-level")).toBeNull();
    const leak = draw("leak");
    expect(leak.querySelector(".fd-module")?.getAttribute("data-level")).toBe("urgent");
    expect(leak.querySelector(".fd-meta .fd-warn[data-block]")?.textContent).toBe("Warning: Leak detected");
    const smoke = draw("smoke");
    expect(smoke.querySelector(".fd-module")?.getAttribute("data-level")).toBe("alarm");
    expect(smoke.querySelector(".fd-read-fig")?.textContent).toBe("SMOKESmoke");
    expect(smoke.querySelector(".fd-meta")?.textContent).toBe("DetectedSince 11:52");
    expect(screen.getByRole("alert").textContent).toBe("Alarm: Hallway smoke, smoke detected.");
  });

  it("prints a low battery on the plate in place of the area, and a row's pressing warning there too", () => {
    expect(draw("lowBattery").querySelector(".fd-area")?.textContent).toBe("Warning: Battery 9%");
    expect(draw("leak", "compact").querySelector(".fd-area")?.textContent).toBe("Warning: Leak detected");
    expect(draw("leak").querySelector(".fd-area")?.textContent).toBe("Kitchen");
  });

  it("blanks the screen while unavailable and says when it was last seen", () => {
    const container = draw("unavailable");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
  });

  it("leads a compact row with its glyph", () => {
    expect(draw("closed", "compact").querySelector(".fd-module > .fd-glyph")).not.toBeNull();
  });
});
