import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/lock.json";
import { HaTitanLockCard } from "./HaTitanLockCard";

const raw = fixture as HassEntities;
const ID = "lock.front_door";

describe("HaTitanLockCard", () => {
  it("follows the shared store when the entity becomes unavailable", async () => {
    const live = renderConnected(<HaTitanLockCard entityId={ID} />, raw);
    await waitFor(() => expect(live.container.querySelector(".titan-card")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".titan-card")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
