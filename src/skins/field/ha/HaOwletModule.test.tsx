import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { HaOwletModule } from "./HaOwletModule";
import { renderConnected } from "@scope/core/testing";
import { OWLET_DEMO_ENTITIES, owletDemoEntities } from "@scope/core/demo";

const ID = "sensor.owlet_sock_ac000w0123_sleep_state";
const BASE = "switch.owlet_sock_ac000w0123_base_station_on";
const renderLive = (props = {}) => renderConnected(<HaOwletModule entityId={ID} name="Nova" area="Nursery" loadHistory={false} {...props} />, OWLET_DEMO_ENTITIES);

describe("HaOwletModule", () => {
  // jsdom has no modal dialog; these do what a browser's do to the `open` attribute.
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  });

  it("composes the sleep state with the heart rate and oxygen sensors found beside it", async () => {
    const { container } = renderLive();
    await waitFor(() => expect(container.querySelector(".fd-module .fd-read")?.textContent).toBe("121bpm"));
    expect([...container.querySelectorAll(".fd-module .fd-meta > span")].map((s) => s.textContent)).toEqual(["Deep sleep", "98% O₂"]);
  });

  it("makes the base station's vitals alert the alarm, and lets the advisory battery step aside", async () => {
    const { container, ...fake } = renderLive();
    await waitFor(() => expect(container.querySelector(".fd-module .fd-read")?.textContent).toBe("121bpm"));
    act(() => fake.emit(owletDemoEntities({ "binary_sensor.owlet_sock_ac000w0123_low_oxygen_alert": "on", "binary_sensor.owlet_sock_ac000w0123_low_battery_alert": "on" })));
    await waitFor(() => expect(container.querySelector(".fd-module")?.getAttribute("data-level")).toBe("alarm"));
    expect(container.querySelector(".fd-module .fd-read")?.textContent).toBe("98% O₂");
    expect(container.querySelector(".fd-module .fd-meta > span")?.textContent).toBe("Low");
    expect(container.querySelector(".fd-module .fd-area")?.textContent).toBe("Nursery");
  });

  it("switches the base station from the panel with the service for the state it shows", async () => {
    const live = renderLive({ defaultOpen: true });
    const key = await screen.findByRole("button", { name: "Base station" });
    expect(key.getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      fireEvent.click(key);
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("switch", "turn_off", { entity_id: BASE });
  });

  it("follows the store when the sock stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("deep_sleep"));
    const gone = owletDemoEntities({ [ID]: "unavailable", "sensor.owlet_sock_ac000w0123_heart_rate": "unavailable", "sensor.owlet_sock_ac000w0123_o2_saturation": "unavailable" });
    act(() => live.emit(gone));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
