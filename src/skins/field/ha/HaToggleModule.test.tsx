import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaToggleModule } from "./HaToggleModule";
import type { HassEntities } from "../../../ha/types";
import { renderConnected } from "../../../ha/testing";
import fixture from "../../../ha/fixtures/toggle.json";

const raw = fixture as HassEntities;

describe("HaToggleModule", () => {
  it("routes the key to the toggle service of the entity id's own domain", async () => {
    const live = renderConnected(
      <>
        <HaToggleModule entityId="input_boolean.guest_mode" loadHistory={false} />
        <HaToggleModule entityId="switch.lamp" loadHistory={false} />
      </>,
      raw,
    );
    await waitFor(() => expect(screen.getByRole("heading", { name: "Guest" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Guest" }));
      fireEvent.click(screen.getByRole("button", { name: "Lamp" }));
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("input_boolean", "toggle", { entity_id: "input_boolean.guest_mode" });
    expect(live.callService).toHaveBeenCalledWith("switch", "toggle", { entity_id: "switch.lamp" });
  });

  it("passes the host's icon and description through, and follows the store when it stops responding", async () => {
    const live = renderConnected(<HaToggleModule entityId="input_boolean.guest_mode" icon="guest" description="Lets visitors on the Wi-Fi." loadHistory={false} defaultOpen />, raw);
    await waitFor(() => expect(screen.getByText("Lets visitors on the Wi-Fi.")).toBeTruthy());
    // The module's key and the panel's, which is open.
    const keys = () => screen.getAllByRole("button", { name: "Guest", hidden: true }) as HTMLButtonElement[];
    expect(keys().map((key) => key.disabled)).toEqual([false, false]);
    act(() => live.emit({ ...raw, "input_boolean.guest_mode": { ...raw["input_boolean.guest_mode"], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
    expect(keys().map((key) => key.disabled)).toEqual([true, true]);
  });
});
