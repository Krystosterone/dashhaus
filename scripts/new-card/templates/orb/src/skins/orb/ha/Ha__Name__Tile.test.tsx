import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Ha__Name__Tile } from "./Ha__Name__Tile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/__name__.json";

const raw = fixture as HassEntities;
const ID = "__fixtureId__";

describe("Ha__Name__Tile", () => {
  it("maps the raw entity into the tile, and follows the store when it stops responding", async () => {
    const live = renderConnected(<Ha__Name__Tile entityId={ID}__loadHistory__ />, raw);
    await waitFor(() => expect(live.container.querySelector("article")?.getAttribute("data-state")).toBe(raw[ID].state));
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector("article")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
