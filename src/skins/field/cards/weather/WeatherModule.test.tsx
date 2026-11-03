import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeatherModule } from "./WeatherModule";
import { WEATHER_SEEDS, WEATHER_WORST_CASE } from "@dashhaus/core/seeds/weather";
import type { WeatherSeed } from "@dashhaus/core/seeds/weather";

const draw = ({ entity, history, hourly, daily }: WeatherSeed, footprint?: "compact" | "standard") =>
  render(<WeatherModule entity={entity} history={history} hourly={hourly} daily={daily} footprint={footprint} />).container;

describe("WeatherModule", () => {
  it("reads the temperature, then rain on its way and how it feels, with nothing to press but its name", () => {
    const el = draw(WEATHER_SEEDS.partly);
    expect(el.querySelector(".fd-read")?.textContent).toBe("6.2°C");
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("0");
    expect(el.querySelector(".fd-meta")?.textContent).toBe("70% rain at 14:00Feels 4°");
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Home details"]);
    expect(el.querySelector(".fd-glyph")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("lights the sky's pictogram in the figure's ink, never a parameter's colour", () => {
    const pict = draw(WEATHER_SEEDS.partly).querySelector<HTMLElement>(".fd-screen .fd-pict");
    expect(pict?.dataset.param).toBe("neutral");
    expect(pict?.dataset.lit).toBe("true");
  });

  it("names falling rain once, by when it stops", () => {
    expect(draw(WEATHER_SEEDS.rain).querySelector(".fd-meta")?.textContent).toBe("Rain until 16:00Feels 7°");
  });

  it("leads with the most urgent warning behind the marker, counts the rest, and speaks them all", () => {
    const warn = draw(WEATHER_WORST_CASE[0]).querySelector(".fd-meta .fd-warn");
    expect(warn?.querySelector(".fd-wx-warn-l")?.textContent).toBe("Hazardous air +2");
    expect(warn?.querySelector(".fd-wx-warn-s")?.textContent).toBe("3 warnings");
    expect(warn?.querySelector(".fd-sr:last-child")?.textContent).toBe("Hazardous air, Gusts 84 mph, Extreme UV");
  });

  it("draws today's low and high, forecast included, over a neutral meter in the fader's place", () => {
    const el = draw(WEATHER_SEEDS.partly);
    expect(el.querySelector(".fd-wx-row .fd-legend-v")?.textContent).toBe("2°–8°");
    const meter = within(el.querySelector(".fd-wx-row") as HTMLElement).getByRole("img");
    expect(meter.dataset.tone).toBe("neutral");
    expect(meter.getAttribute("aria-label")).toBe("Temperature by hour today. 2°–8°.");
  });

  it("spells a range below zero out, so a dash never meets a minus", () => {
    expect(draw(WEATHER_SEEDS.snow).querySelector(".fd-wx-row .fd-legend-v")?.textContent).toBe("-3° to -1°");
  });

  it("gives a compact row's area line to the first meta line: a warning behind the marker, else the sky", () => {
    expect(draw(WEATHER_SEEDS.partly, "compact").querySelector(".fd-area")?.textContent).toBe("70% rain at 14:00");
    const area = draw(WEATHER_WORST_CASE[0], "compact").querySelector(".fd-area");
    expect(area?.querySelector(".fd-warn svg")).not.toBeNull();
    expect(area?.textContent).toBe("Warning: Hazardous air +2");
  });

  it("blanks the screen while unavailable, with when it was last seen, and keeps what today read", () => {
    const el = draw(WEATHER_SEEDS.unavailable);
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(el.querySelector(".fd-meta")?.textContent).toBe("UnavailableSeen 08:20");
    expect(el.querySelector(".fd-screen .fd-pict")?.getAttribute("data-lit")).toBe("false");
    expect(el.querySelector(".fd-wx-row .fd-legend-v")?.textContent).toBe("2°–3°");
    expect(el.querySelectorAll(".fd-meter-h[data-state='unav']").length).toBeGreaterThan(0);
  });

  it("says when no temperature has arrived, in blank segments", () => {
    const el = draw(WEATHER_WORST_CASE[1]);
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(el.querySelector(".fd-meta")?.textContent).toBe("FogNo temperature yet");
  });

  it("opens the panel from the name: feels-like on the second channel, every warning, the forecasts, every reading", () => {
    const { entity, history, hourly, daily } = WEATHER_SEEDS.summer;
    render(<WeatherModule entity={entity} history={history} hourly={hourly} daily={daily} />);
    fireEvent.click(screen.getByRole("button", { name: "Home details" }));
    const panel = screen.getByRole("dialog", { name: "Home details" });
    expect(panel.querySelector(".fd-chan")?.textContent).toBe("35°Feels like");
    expect([...panel.querySelectorAll(".fd-wx-say li")].map((li) => li.textContent)).toEqual([
      "Warning: Poor air",
      "Warning: Very high UV",
      "Sunny · 60% storms at 17:00",
    ]);
    expect(panel.querySelector(".fd-today .fd-legend")?.textContent).toBe("Temperature todayLow 20° · High 33°");
    expect(within(panel).getByRole("img", { name: /^Next hours: / }).getAttribute("aria-label")).toMatch(/^Next hours: 12:00, Sunny, 32°; 13:00, Sunny, 33°;/);
    expect(panel.querySelectorAll(".fd-wx-strip--days .fd-wx-col")).toHaveLength(5);
    expect([...panel.querySelectorAll(".fd-wx-fact")].map((f) => f.textContent)).toEqual([
      "Dew point20.1°",
      "Humidity52%",
      "Wind8 km/hSW, gusts 14",
      "Air qualityWarning: 128 Sensitive",
      "UV indexWarning: 8 Very high",
      "Pressure1009 hPa",
    ]);
    expect(panel.querySelector(".fd-info")?.textContent).toBe("Updated 11:53");
  });

  it("keeps an unavailable panel to what was read and when it was last seen", () => {
    render(<WeatherModule entity={WEATHER_SEEDS.unavailable.entity} history={WEATHER_SEEDS.unavailable.history} defaultOpen />);
    const panel = screen.getByRole("dialog");
    expect(panel.querySelector(".fd-wx-strip, .fd-wx-facts, .fd-wx-say")).toBeNull();
    expect(panel.querySelector(".fd-info")?.textContent).toBe("Last seen 08:20");
  });

  it("says when no forecast has come yet", () => {
    render(<WeatherModule entity={WEATHER_SEEDS.partly.entity} defaultOpen />);
    expect(screen.getByRole("dialog").querySelector(".fd-block .fd-legend")?.textContent).toBe("Next hoursNo forecast yet");
  });
});
