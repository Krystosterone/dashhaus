import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/__name__.json";
import { Ha__Skin____Name__Card } from "./Ha__Skin____Name__Card";

const raw = fixture as HassEntities;
const ID = "__fixtureId__";

describe("Ha__Skin____Name__Card", () => {
  it("follows the shared store when the entity becomes unavailable", async () => {
    const live = renderConnected(<Ha__Skin____Name__Card entityId={ID}__loadHistory__ />, raw);
    await waitFor(() => expect(live.container.querySelector(".__skin__-card")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".__skin__-card")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
