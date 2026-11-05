import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/lock.json";
import { HaGlasshouseLockCard } from "./HaGlasshouseLockCard";

const raw = fixture as HassEntities;
const ID = "lock.front_door";

describe("HaGlasshouseLockCard", () => {
  it("follows the shared store when the entity becomes unavailable", async () => {
    const live = renderConnected(<HaGlasshouseLockCard entityId={ID} />, raw);
    await waitFor(() => expect(live.container.querySelector(".glasshouse-card")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".glasshouse-card")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
