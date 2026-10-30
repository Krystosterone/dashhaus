import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaToggleTile } from "./HaToggleTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "input_boolean.guest_mode": {
    entity_id: "input_boolean.guest_mode",
    state: "on",
    attributes: { friendly_name: "Guest" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};


describe("HaToggleTile", () => {
  it("maps a raw entity into the existing ToggleTile and routes toggle through the store", async () => {
    const fake = renderConnected(<HaToggleTile entityId="input_boolean.guest_mode" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Guest" })).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Guest" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("input_boolean", "toggle", { entity_id: "input_boolean.guest_mode" });
  });

  it("passes host metadata through to the mapped entity", async () => {
    renderConnected(
      <HaToggleTile entityId="input_boolean.guest_mode" icon="guest" color="lavender" description="Lets visitors on the Wi-Fi." />,
      raw,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Guest" })).toBeTruthy());
  });
});
