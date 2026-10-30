import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaAlarmModule } from "./HaAlarmModule";
import type { HassEntities } from "@scope/core";
import { renderConnected } from "@scope/core/testing";
import fixture from "@scope/core/fixtures/alarm.json";

const raw = fixture as HassEntities;
const ID = "alarm_control_panel.disarmed";
const key = (name: string) => screen.getAllByRole("button", { name, hidden: true })[0];

describe("HaAlarmModule", () => {
  it("arms through the native service with the code typed on the panel's keypad", async () => {
    const live = renderConnected(<HaAlarmModule entityId={ID} loadHistory={false} />, raw);
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("disarmed"));
    fireEvent.click(key("Arm away"));
    for (const d of ["1", "2", "3", "4"]) fireEvent.click(key(d));
    await act(async () => {
      fireEvent.click(key("Enter code"));
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("alarm_control_panel", "alarm_arm_away", { entity_id: ID, code: "1234" });
  });

  it("sends nothing from a view-only module", async () => {
    const live = renderConnected(<HaAlarmModule entityId={ID} loadHistory={false} readOnly />, raw);
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("disarmed"));
    expect(live.container.querySelector(".fd-module .fd-key")).toBeNull();
  });

  it("follows the store when the panel stops responding", async () => {
    const live = renderConnected(<HaAlarmModule entityId={ID} loadHistory={false} />, raw);
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
