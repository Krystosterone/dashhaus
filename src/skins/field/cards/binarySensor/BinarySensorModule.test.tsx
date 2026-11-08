import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BinarySensorModule } from "./BinarySensorModule";
import { BINARY_SENSOR_SEEDS, atTime } from "@dashhaus/core/seeds/binarySensor";
import type { BinarySensorEntity } from "@dashhaus/core/entities/binarySensor/types";

/*
 * What every field module does, whatever it is: a reading has no keys, a lit pictogram says on, and unavailable
 * blanks the screen (spec/field.md → Unavailable). The frame (footprints, details) is ModuleFrame's, tested in
 * shared/ui.test.tsx; this tests what the binary sensor itself does.
 */
const draw = (name: keyof typeof BINARY_SENSOR_SEEDS, footprint?: "compact" | "standard") => {
  const seed = atTime(BINARY_SENSOR_SEEDS[name], Date.now());
  return render(<BinarySensorModule entity={seed.entity} history={seed.history} footprint={footprint} />).container;
};

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

  it("speaks in four places at most, OK for a clear detector, never stepping the type down", () => {
    const fig = (entity: BinarySensorEntity) => render(<BinarySensorModule entity={entity} />).container.querySelector(".fd-read-fig")?.textContent;
    const base: BinarySensorEntity = { entityId: "binary_sensor.x", name: "X", state: "on" };
    expect(fig({ ...base, deviceClass: "carbon_monoxide" })).toBe("COCO");
    expect(fig({ ...base, deviceClass: "moisture", state: "off" })).toBe("DRYDry");
    expect(fig({ ...base, deviceClass: "presence", state: "off" })).toBe("AWAYAway");
    expect(fig({ ...base, deviceClass: "connectivity" })).toBe("ONConnected");
    const clear = draw("lowBattery");
    expect(clear.querySelector(".fd-read-fig")?.textContent).toBe("OKClear");
    expect(clear.querySelector(".fd-module")?.getAttribute("data-state")).toBe("off");
  });

  it("says how long ago an alarm went off in a row, NOW under a minute, and blank segments when it can't know", () => {
    const smoke = BINARY_SENSOR_SEEDS.smoke.entity;
    const row = (entity: BinarySensorEntity) => render(<BinarySensorModule entity={entity} footprint="compact" />).container.querySelector(".fd-read-fig");
    expect(row({ ...smoke, changedAt: Date.now() - 3 * 60_000 })?.textContent).toBe("Smoke, 3m");
    expect(row({ ...smoke, changedAt: Date.now() })?.textContent).toBe("Smoke, NOW");
    expect(row({ ...smoke, changedAt: undefined })?.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(draw("smoke", "compact").querySelector(".fd-read-fig")?.textContent).toBe("Smoke, 2m");
  });

  it("warns of a garage door left open as the cover does, on the screen, and in a row on the area's line", () => {
    const long = BINARY_SENSOR_SEEDS.long.entity;
    const standard = render(<BinarySensorModule entity={long} />).container;
    expect(standard.querySelector(".fd-meta")?.textContent).toBe("Warning: OpenSince Fri 18:30");
    expect(standard.querySelector(".fd-area")?.textContent).toBe(long.area);
    const row = render(<BinarySensorModule entity={long} footprint="compact" />).container;
    expect(row.querySelector(".fd-area")?.textContent).toBe("Warning: Open since Fri 18:30");
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
