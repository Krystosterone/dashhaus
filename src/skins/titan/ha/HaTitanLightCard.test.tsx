import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/light.json";
import { HaTitanLightCard } from "./HaTitanLightCard";

const raw = fixture as HassEntities;
const ID = "light.living_room";

describe("HaTitanLightCard", () => {
  it("follows the shared store when the entity becomes unavailable", async () => {
    const live = renderConnected(<HaTitanLightCard entityId={ID} loadHistory={false} />, raw);
    await waitFor(() => expect(live.container.querySelector(".titan-card")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".titan-card")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
