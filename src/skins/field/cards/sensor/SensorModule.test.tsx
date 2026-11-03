import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SensorModule } from "./SensorModule";
import { SENSOR_SEEDS, SENSOR_WORST_CASE } from "@dashhaus/core/seeds/sensor";
import type { SensorSeed } from "@dashhaus/core/seeds/sensor";

const draw = ({ entity, history }: SensorSeed, footprint?: "compact" | "standard", withHistory = true) =>
  render(<SensorModule entity={entity} history={withHistory ? history : undefined} footprint={footprint} />).container;

describe("SensorModule", () => {
  it("reads the temperature, then the humidity and comfort, with nothing to press but its name", () => {
    const el = draw(SENSOR_SEEDS.living);
    expect(el.querySelector(".fd-read")?.textContent).toBe("21.4°C");
    expect(el.querySelector(".fd-meta")?.textContent).toBe("44% RHComfortable");
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Living room details"]);
    expect(el.querySelector(".fd-glyph")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps a temperature's places, the leading one unlit", () => {
    expect(draw(SENSOR_SEEDS.outdoor).querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("0");
  });

  it("lights its thermometer in the figure's ink, never a parameter's colour", () => {
    const pict = draw(SENSOR_SEEDS.living).querySelector<HTMLElement>(".fd-pict");
    expect(pict?.dataset.param).toBe("neutral");
    expect(pict?.dataset.lit).toBe("true");
  });

  it("gives outdoors its trend where comfort would be", () => {
    expect(draw(SENSOR_SEEDS.outdoor).querySelector(".fd-meta")?.textContent).toBe("78% RHSteady");
  });

  it("puts a low battery in the area's place, behind the warning marker, said as a warning, in both footprints", () => {
    for (const footprint of ["standard", "compact"] as const) {
      const el = draw(SENSOR_SEEDS.basement, footprint);
      const area = el.querySelector(".fd-area");
      expect(area?.querySelector(".fd-warn svg")).not.toBeNull();
      expect(area?.textContent).toBe("Warning: Battery 8%");
      el.remove();
    }
    expect(draw(SENSOR_SEEDS.basement).querySelector(".fd-meta")?.textContent).toBe("28% RHCool, dry");
  });

  it("draws today's low and high over a neutral meter in the fader's place", () => {
    const el = draw(SENSOR_SEEDS.living);
    expect(el.querySelector(".fd-sw-row .fd-legend-v")?.textContent).toBe("19.5°–21.4°");
    const meter = within(el.querySelector(".fd-sw-row") as HTMLElement).getByRole("img");
    expect(meter.dataset.tone).toBe("neutral");
    expect(meter.getAttribute("aria-label")).toBe("Temperature by hour today. 19.5°–21.4°.");
  });

  it("keeps the meter dark, with no hour marked now, without history", () => {
    const el = draw(SENSOR_SEEDS.living, "standard", false);
    expect(el.querySelectorAll(".fd-meter-h[data-state='none']")).toHaveLength(24);
    expect(el.querySelector(".fd-meter-h[data-now]")).toBeNull();
  });

  it("makes humidity the figure of a sensor that only has that", () => {
    const el = draw(SENSOR_SEEDS.humidityOnly);
    expect(el.querySelector(".fd-read")?.textContent).toBe("52%");
    expect(el.querySelector(".fd-meta")?.textContent).toBe("HumidityComfortable");
  });

  it("blanks the screen while unavailable, with when it was last seen, and makes up no reading", () => {
    const el = draw(SENSOR_SEEDS.garage);
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(el.querySelector(".fd-meta")?.textContent).toBe("UnavailableSeen 08:20");
    expect(el.querySelector(".fd-warn")).toBeNull();
    expect(el.querySelectorAll(".fd-meter-h[data-state='unav']").length).toBeGreaterThan(0);
  });

  it("says when no reading has arrived yet, in blank segments", () => {
    const el = draw(SENSOR_WORST_CASE[2]);
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(el.querySelector(".fd-meta")?.textContent).toBe("No reading yet");
  });

  it("opens the panel from the name: humidity on the second channel, both days, the battery", () => {
    draw(SENSOR_SEEDS.living);
    fireEvent.click(screen.getByRole("button", { name: "Living room details" }));
    const panel = screen.getByRole("dialog", { name: "Living room details" });
    expect(panel.querySelector(".fd-chan")?.textContent).toBe("44%Humidity");
    expect([...panel.querySelectorAll(".fd-today .fd-legend")].map((l) => l.textContent)).toEqual([
      "Temperature todayLow 19.5° · High 21.4°",
      "Humidity todayLow 44% · High 47%",
    ]);
    expect(panel.querySelector(".fd-info")?.textContent).toBe("Comfortable · RisingBattery 82% · Updated 11:52");
  });

  it("leads the panel's facts with a low battery and what to do", () => {
    render(<SensorModule entity={SENSOR_SEEDS.basement.entity} history={SENSOR_SEEDS.basement.history} defaultOpen />);
    expect(screen.getByRole("dialog").querySelector(".fd-info")?.textContent).toBe("Warning: Battery 8%, replace soonUpdated 11:40");
  });
});
