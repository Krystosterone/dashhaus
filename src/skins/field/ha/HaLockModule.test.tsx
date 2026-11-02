import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaLockModule } from "./HaLockModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/lock.json";

const raw = fixture as HassEntities;

describe("HaLockModule", () => {
  it("locks an unlocked lock through Home Assistant's lock.lock", async () => {
    const live = renderConnected(<HaLockModule entityId="lock.back_door" />, raw);
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unlocked"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lock Back door" }));
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("lock", "lock", { entity_id: "lock.back_door" });
  });

  it("sends nothing when a locked lock's key is pressed: it asks for the code first", async () => {
    const live = renderConnected(<HaLockModule entityId="lock.front_door" />, raw);
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("locked"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unlock Front door: asks first" }));
      await Promise.resolve();
    });
    expect(live.callService).not.toHaveBeenCalled();
    expect(screen.getByText("Code to unlock")).toBeTruthy();
  });

  it("shows a missing entity as unavailable", async () => {
    const live = renderConnected(<HaLockModule entityId="lock.missing" />, raw);
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
