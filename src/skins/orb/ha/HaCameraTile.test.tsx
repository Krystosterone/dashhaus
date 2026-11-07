import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaCameraTile } from "./HaCameraTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "camera.front_door": {
    entity_id: "camera.front_door",
    state: "recording",
    attributes: { friendly_name: "Front door", access_token: "t", entity_picture: "/api/camera_proxy/camera.front_door?token=t" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

describe("HaCameraTile", () => {
  it("maps the raw entity into the tile, with its still in a well", async () => {
    const { container } = renderConnected(<HaCameraTile entityId="camera.front_door" />, raw);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Front door" })).toBeTruthy());
    expect(screen.getByRole("button", { name: /^Front door: Recording, since .+\. Open details$/ })).toBeTruthy();
    expect(container.querySelector(".hd-pic")).not.toBeNull();
  });

  it("draws no well at all with its stills switched off", async () => {
    const { container } = renderConnected(<HaCameraTile entityId="camera.front_door" still={false} />, raw);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Front door" })).toBeTruthy());
    expect(container.querySelector(".hd-pic")).toBeNull();
  });

  it("opens the details from the name, as every card does", async () => {
    renderConnected(<HaCameraTile entityId="camera.front_door" />, raw);
    await waitFor(() => expect(screen.getByRole("button", { name: "Front door details" })).toBeTruthy());
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaCameraTile entityId="camera.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});
