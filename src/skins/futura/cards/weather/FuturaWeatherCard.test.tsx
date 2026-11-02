import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FuturaWeatherCard } from "./FuturaWeatherCard";
import { WEATHER_SEEDS } from "./demo/weather";

const draw = (seed: keyof typeof WEATHER_SEEDS, defaultOpen = false) => render(<FuturaWeatherCard entity={WEATHER_SEEDS[seed].entity} defaultOpen={defaultOpen} />);

describe("FuturaWeatherCard", () => {
  it("keeps the entity identity and unavailable state explicit", () => {
    const available = draw("partly");
    expect(available.getByRole("button", { name: WEATHER_SEEDS.partly.entity.name })).toBeTruthy();
    const unavailable = draw("unavailable");
    expect(unavailable.container.querySelector(".futura-card")?.getAttribute("data-state")).toBe("unavailable");
    expect(unavailable.getByText("Unavailable")).toBeTruthy();
  });

  it("opens its domain facts in Details", () => {
    const view = draw("partly");
    fireEvent.click(view.getByRole("button", { name: WEATHER_SEEDS.partly.entity.name }));
    expect(view.getByRole("dialog").textContent).toContain(WEATHER_SEEDS.partly.entity.entityId);
  });
});
