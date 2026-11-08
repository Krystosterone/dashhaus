import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaSunTile } from "./HaSunTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const minute = 60_000;
const soon = (ms: number) => new Date(Math.ceil(Date.now() / minute) * minute + ms).toISOString();
const raw = (): HassEntities => ({
  "sun.sun": {
    entity_id: "sun.sun",
    state: "above_horizon",
    attributes: { friendly_name: "Sun", next_setting: soon(2 * 60 * minute), next_rising: soon(14 * 60 * minute), elevation: 20, azimuth: 230 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
});

describe("HaSunTile", () => {
  it("maps the raw entity into the tile, counting down to the sunset", async () => {
    renderConnected(<HaSunTile entityId="sun.sun" />, raw());
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sun" })).toBeTruthy());
    expect(document.querySelector(".hd-area")?.textContent).toMatch(/^Sets in (1h 59m|2h|2h 1m)$/);
  });

  it("draws today's path on a featured tile from the given location", async () => {
    renderConnected(<HaSunTile entityId="sun.sun" footprint="featured" latitude={45.5} longitude={-73.6} />, raw());
    await waitFor(() => expect(screen.getByRole("img", { name: /^The sun's path today/ })).toBeTruthy());
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaSunTile entityId="sun.missing" name="Missing" />, raw());
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});
