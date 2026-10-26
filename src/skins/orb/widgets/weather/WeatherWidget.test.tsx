import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeatherWidget } from "./WeatherWidget";
import type { WeatherEntity } from "../../../../domains/weather/types";

const weather: WeatherEntity = {
  entityId: "weather.home",
  name: "Home",
  state: "partlycloudy",
  isDay: true,
  temperature: 6.2,
  apparentTemperature: 3.8,
  temperatureUnit: "°C",
  windSpeedUnit: "km/h",
  pressureUnit: "hPa",
};
const history = { temperature: [1.9, 2.4, 3.1], currentHour: 2 };

describe("WeatherWidget", () => {
  it("is a reading: no glow, even on a clear day", () => {
    const { container } = render(<WeatherWidget entity={{ ...weather, state: "sunny" }} />);
    const card = container.querySelector("article");

    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
  });

  it("reads the condition and today's low–high on a calm day", () => {
    const { container } = render(<WeatherWidget entity={weather} history={history} />);

    expect(container.querySelector(".hd-area")?.textContent).toBe("Partly cloudy · 2°–6°");
  });

  it("puts warnings, then coming rain, ahead of the condition", () => {
    const hourly = [{ hour: 3, temperature: 6, condition: "rainy" as const, precipitationProbability: 70 }];
    const { container } = render(<WeatherWidget entity={{ ...weather, windGustSpeed: 62 }} history={history} hourly={hourly} />);

    expect(container.querySelector(".hd-area")?.textContent).toBe("Gusts 62 km/h · 70% rain at 03:00 · Partly cloudy · 2°–6°");
  });

  it("leads a card with the most urgent warning and counts the rest; the sheet and the spoken label name them all", () => {
    const stormy = { ...weather, windGustSpeed: 84, aqi: 320, uvIndex: 11 };
    const { container, rerender } = render(<WeatherWidget entity={stormy} history={history} />);
    expect(container.querySelector(".hd-area .wx-warn-l")?.textContent).toBe("Hazardous air +2");
    expect(container.querySelector(".hd-area .wx-warn-s")?.textContent).toBe("3 warnings");
    expect(screen.getByRole("img", { name: /^Warning: / }).getAttribute("aria-label")).toBe("Warning: Home: Hazardous air, Gusts 84 km/h, Extreme UV");
    rerender(<WeatherWidget entity={stormy} history={history} variant="sheet" />);
    expect(container.querySelector(".hd-area")?.textContent).toContain("Hazardous air · Gusts 84 km/h · Extreme UV");
  });

  it("names falling rain once, by when it stops", () => {
    const hourly = [{ hour: 3, temperature: 6, condition: "cloudy" as const }];
    const { container } = render(<WeatherWidget entity={{ ...weather, state: "rainy" }} history={history} hourly={hourly} />);

    expect(container.querySelector(".hd-area")?.textContent).toBe("Rain until 03:00 · 2°–6°");
  });

  it("speaks the temperature with feels-like", () => {
    render(<WeatherWidget entity={weather} />);

    expect(screen.getByRole("img", { name: "6.2 degrees now, feels like 4" })).toBeTruthy();
  });

  it("speaks the sheet's large figure, which stands in for the reading", () => {
    render(<WeatherWidget entity={weather} variant="sheet" />);

    expect(screen.getByRole("img", { name: "6.2 degrees now, feels like 4" }).className).toBe("hd-num");
  });
});
