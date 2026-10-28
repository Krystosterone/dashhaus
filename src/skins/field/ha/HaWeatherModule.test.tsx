import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaWeatherModule } from "./HaWeatherModule";
import type { HassEntities } from "../../../ha/types";
import { renderConnected } from "../../../ha/testing";
import fixture from "../../../ha/fixtures/weather.json";

const ID = "weather.home";
const raw: HassEntities = {
  ...(fixture as HassEntities),
  "sensor.home_aqi": { entity_id: "sensor.home_aqi", state: "42", attributes: { device_class: "aqi" }, last_changed: "2026-10-20T10:00:00Z", last_updated: "2026-10-20T10:00:00Z" },
};
const history = { temperature: [14, 16, 18], currentHour: 2 };
const daily = [{ day: "Tue", condition: "sunny" as const, high: 24, low: 12 }];
const renderLive = () => renderConnected(
  <HaWeatherModule entityId={ID} aqiEntityId="sensor.home_aqi" aqiScale="US" history={history} daily={daily} loadForecasts={false} />,
  raw,
);

describe("HaWeatherModule", () => {
  it("reads the temperature, the sky and how it feels onto the module's screen, with nothing to press but its name", async () => {
    const { container } = renderLive();
    await waitFor(() => expect(container.querySelector(".fd-read")?.textContent).toBe("21.5°C"));
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Partly cloudyFeels 21°");
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Home details"]);
  });

  it("warns when the AQI companion turns poor, and blanks the screen when the entity stops answering", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-read")?.textContent).toBe("21.5°C"));

    act(() => live.emit({ ...raw, "sensor.home_aqi": { ...raw["sensor.home_aqi"], state: "160" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-meta .fd-warn")?.textContent).toBe("Warning: Poor air"));

    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----"));
  });

  it("passes the forecasts the host supplies to the panel", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-read")?.textContent).toBe("21.5°C"));
    fireEvent.click(screen.getByRole("button", { name: "Home details" }));
    expect(screen.getByRole("img", { name: /^Next days: / }).getAttribute("aria-label")).toBe("Next days: Today, Sunny, high 24°, low 12°.");
  });
});
