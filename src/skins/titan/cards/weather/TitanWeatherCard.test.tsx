import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitanWeatherCard } from "./TitanWeatherCard";
import { WEATHER_SEEDS } from "@dashhaus/core/seeds/weather";

const draw = (seed: keyof typeof WEATHER_SEEDS, defaultOpen = false) => render(<TitanWeatherCard entity={WEATHER_SEEDS[seed].entity} defaultOpen={defaultOpen} />);

describe("TitanWeatherCard", () => {
  it("keeps the entity identity and unavailable state explicit", () => {
    const available = draw("partly");
    expect(available.getByRole("button", { name: WEATHER_SEEDS.partly.entity.name })).toBeTruthy();
    const unavailable = draw("unavailable");
    expect(unavailable.container.querySelector(".titan-card")?.getAttribute("data-state")).toBe("unavailable");
    expect(unavailable.getByText("Unavailable")).toBeTruthy();
  });

  it("opens its domain facts in Details", () => {
    const view = draw("partly");
    fireEvent.click(view.getByRole("button", { name: WEATHER_SEEDS.partly.entity.name }));
    expect(view.getByRole("dialog").textContent).toContain(WEATHER_SEEDS.partly.entity.entityId);
  });
});
