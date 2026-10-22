import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeWidget } from "./HomeWidget";

const weather = {
  entityId: "weather.home",
  name: "Home",
  state: "partlycloudy" as const,
  temperature: undefined,
  temperatureUnit: "°C" as const,
  windSpeedUnit: "km/h" as const,
  pressureUnit: "hPa" as const,
};

describe("HomeWidget daylight presentation", () => {
  it("uses a neutral scene when daylight is unknown", () => {
    const { container } = render(<HomeWidget entity={{ ...weather }} />);
    const scene = container.querySelector(".sc");

    expect(scene?.getAttribute("data-daylight")).toBe("unknown");
    expect(scene?.getAttribute("data-night")).toBeNull();
    expect(container.querySelector("article")?.getAttribute("data-glow")).toBeNull();
  });
});
