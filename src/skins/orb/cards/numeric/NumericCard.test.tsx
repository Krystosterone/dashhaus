import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumericCard } from "./NumericCard";
import { NUMERIC_SEEDS } from "@dashhaus/core/seeds/numeric";
import type { NumericEntity } from "@dashhaus/core/entities/numeric/types";

const entity: NumericEntity = { entityId: "sensor.living_room_co2", name: "Living room CO₂", area: "Living room", state: "ok", value: 650.25, unit: "ppm", deviceClass: "carbon_dioxide", stateClass: "measurement" };

describe("NumericCard", () => {
  it("is a reading: no glow, a bare icon, its class prefix", () => {
    const { container } = render(<NumericCard entity={entity} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd nm");
    expect(container.querySelector(".hd-orb--static")).not.toBeNull();
  });

  it("reads the figure aloud with today's range, and opens details from it", () => {
    const onOpenDetails = vi.fn();
    const { co2 } = NUMERIC_SEEDS;
    render(<NumericCard entity={co2.entity} history={co2.history} onOpenDetails={onOpenDetails} />);
    screen.getByRole("button", { name: "Living room CO₂: 650 ppm, today Low 470 ppm · High 940 ppm. Open details" }).click();
    expect(onOpenDetails).toHaveBeenCalled();
    expect(screen.getByText("470–940")).toBeTruthy();
  });

  it("says the area and what it measures on the status line, and the area alone with no class", () => {
    const { container, rerender } = render(<NumericCard entity={entity} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Living room · CO₂");
    rerender(<NumericCard entity={{ ...entity, deviceClass: undefined }} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Living room");
  });

  it("keeps a huge figure to five places, scaled, and says it in full", () => {
    const { container } = render(<NumericCard entity={{ ...entity, value: 1234567.8, unit: "Wh" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("1.2M Wh");
    expect(screen.getByRole("img", { name: "1234568 Wh" })).toBeTruthy();
  });

  it("keeps the sign of a negative reading and draws a reading with no unit bare", () => {
    const { container, rerender } = render(<NumericCard entity={{ ...entity, value: -1240, unit: "W" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("-1240 W");
    rerender(<NumericCard entity={{ ...entity, value: 2481, unit: undefined }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("2481");
  });

  it("says a meter's rise today, not its low and high", () => {
    const { energy } = NUMERIC_SEEDS;
    render(<NumericCard entity={energy.entity} history={energy.history} footprint="featured" />);
    expect(screen.getByText("+8.6")).toBeTruthy();
    expect(screen.getByText("+8.6 kWh today")).toBeTruthy();
  });

  it("waits for a first reading in the sensor card's words", () => {
    const { container, rerender } = render(<NumericCard entity={{ ...entity, value: undefined }} />);
    expect(screen.getByRole("img", { name: "no reading yet" })).toBeTruthy();
    expect(container.querySelector(".hd-none")?.textContent).toBe("Waiting…");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Living room · No reading yet");
    rerender(<NumericCard entity={{ ...entity, value: undefined }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Waiting…");
  });

  it("leaves out today's metric where it can't fit whole, and the strip still says it", () => {
    const { export: grid } = NUMERIC_SEEDS;
    const { container } = render(<NumericCard entity={grid.entity} history={grid.history} variant="sheet" />);
    expect(container.querySelector(".nm-today")).toBeNull();
    expect(screen.getByText("Low -1240 W · High 420 W")).toBeTruthy();
  });

  it("hides the last value while unavailable", () => {
    const { container } = render(<NumericCard entity={{ ...entity, state: "unavailable", lastSeen: "08:20" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Unavailable");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Unavailable");
    expect(screen.queryByText("650")).toBeNull();
  });

  it("puts symbol units on the figure and word units after a space", () => {
    const { container, rerender } = render(<NumericCard entity={{ ...entity, value: 650 }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("650 ppm");
    rerender(<NumericCard entity={{ ...entity, value: 41, unit: "%" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("41%");
  });

  it("warns past a limit the person set: core's word first behind the marker, then the area, the figure in its own ink, no glow", () => {
    const { high } = NUMERIC_SEEDS;
    const { container } = render(<NumericCard entity={high.entity} history={high.history} />);
    const card = container.querySelector("article");
    expect(container.querySelector(".hd-area")?.textContent).toBe("High CO₂ · Bedroom");
    expect(container.querySelector(".hd-area .hd-warn")?.textContent).toBe("High CO₂");
    expect(screen.getAllByRole("img", { name: "Warning: Carbon dioxide above 1200 ppm" }).length).toBeGreaterThan(0);
    expect(card?.getAttribute("data-alert")).toBe("warn");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(container.querySelector(".nm-v")?.closest(".hd-warn")).toBeNull();
  });

  it("warns below a limit too, and never at the limit, unavailable or before a first reading", () => {
    const { low } = NUMERIC_SEEDS;
    const { container, rerender } = render(<NumericCard entity={low.entity} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Low voltage · Basement");
    rerender(<NumericCard entity={{ ...low.entity, value: 12 }} />);
    expect(container.querySelector(".hd-warn")).toBeNull();
    rerender(<NumericCard entity={{ ...low.entity, state: "unavailable" }} />);
    expect(container.querySelector(".hd-warn")).toBeNull();
    rerender(<NumericCard entity={{ ...low.entity, value: undefined }} />);
    expect(container.querySelector(".hd-warn")).toBeNull();
  });

  it("leads a compact row's value line with the warning and the figure after it; a hidden reading's place keeps the figure", () => {
    const { high } = NUMERIC_SEEDS;
    const { container, rerender } = render(<NumericCard entity={high.entity} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("High CO₂ · 1450 ppm");
    expect(container.querySelector(".hd-sub .hd-warn")?.textContent).toBe("High CO₂");
    rerender(<NumericCard entity={high.entity} footprint="compact" showControl={false} />);
    expect(container.querySelector(".hd-val")?.textContent).toBe("1450 ppm");
  });

  it("says the limits in the sheet's small print, whether or not it warns", () => {
    const { co2 } = NUMERIC_SEEDS;
    const { container } = render(<NumericCard entity={co2.entity} variant="sheet" />);
    expect(container.querySelector(".hd-info")?.textContent).toContain("Carbon dioxide in ppm · Warns above 1200 ppm");
    expect(container.querySelector(".hd-warn")).toBeNull();
  });
});
