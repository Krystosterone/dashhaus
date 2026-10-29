import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaHumidifierModule } from "./HaHumidifierModule";
import type { HassEntities } from "../../../ha/types";
import { renderConnected } from "../../../ha/testing";
import fixture from "../../../ha/fixtures/humidifier.json";

const raw = fixture as HassEntities;
const ID = "humidifier.bedroom";
const renderLive = () => renderConnected(<HaHumidifierModule entityId={ID} loadHistory={false} />, raw);

describe("HaHumidifierModule", () => {
  it("sends each of its keys' presses to Home Assistant (a reading has none, so its presses call nothing)", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).not.toBe("unavailable"));
    const keys = [...live.container.querySelectorAll<HTMLButtonElement>(".fd-key")];
    // Some hooks read through Home Assistant as they mount (weather's forecasts); count only what the presses send.
    const before = live.callService.mock.calls.length;
    await act(async () => {
      for (const key of keys) fireEvent.click(key);
      await Promise.resolve();
    });
    expect(live.callService.mock.calls.length - before).toBe(keys.length);
  });

  it("sends the target fader and the panel's mode keys through native humidifier services", async () => {
    const live = renderConnected(<HaHumidifierModule entityId={ID} loadHistory={false} defaultOpen />, raw);
    await waitFor(() => expect(screen.getAllByRole("slider", { name: "Bedroom target humidity" }).length).toBeGreaterThan(0));
    await act(async () => {
      fireEvent.change(screen.getAllByRole("slider", { name: "Bedroom target humidity" })[0], { target: { value: "50" } });
      fireEvent.click(screen.getByRole("button", { name: "Set mode to Eco", hidden: true }));
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("humidifier", "set_humidity", { entity_id: ID, humidity: 50 });
    expect(live.callService).toHaveBeenCalledWith("humidifier", "set_mode", { entity_id: ID, mode: "eco" });
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
