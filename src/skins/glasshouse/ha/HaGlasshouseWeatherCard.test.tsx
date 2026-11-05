import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/weather.json";
import { HaGlasshouseWeatherCard } from "./HaGlasshouseWeatherCard";

const raw = fixture as HassEntities;
const ID = "weather.home";

describe("HaGlasshouseWeatherCard", () => {
  it("follows the shared store when the entity becomes unavailable", async () => {
    const live = renderConnected(<HaGlasshouseWeatherCard entityId={ID} loadHistory={false} />, raw);
    await waitFor(() => expect(live.container.querySelector(".glasshouse-card")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".glasshouse-card")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
