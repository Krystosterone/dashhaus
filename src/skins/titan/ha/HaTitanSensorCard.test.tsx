import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/sensor.json";
import { HaTitanSensorCard } from "./HaTitanSensorCard";

const raw = fixture as HassEntities;
const ID = "sensor.living_room_temperature";

describe("HaTitanSensorCard", () => {
  it("follows the shared store when the entity becomes unavailable", async () => {
    const live = renderConnected(<HaTitanSensorCard entityId={ID} loadHistory={false} />, raw);
    await waitFor(() => expect(live.container.querySelector(".titan-card")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".titan-card")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
