import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/sensor.json";
import { HaFuturaSensorCard } from "./HaFuturaSensorCard";

const raw = fixture as HassEntities;
const ID = "sensor.living_room_temperature";

describe("HaFuturaSensorCard", () => {
  it("follows the shared store when the entity becomes unavailable", async () => {
    const live = renderConnected(<HaFuturaSensorCard entityId={ID} loadHistory={false} />, raw);
    await waitFor(() => expect(live.container.querySelector(".futura-card")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".futura-card")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
