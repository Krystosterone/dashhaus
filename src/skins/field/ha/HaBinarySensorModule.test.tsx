import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaBinarySensorModule } from "./HaBinarySensorModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/binarySensor.json";

const raw = fixture as HassEntities;
const ID = "binary_sensor.front_door";
const renderLive = () => renderConnected(<HaBinarySensorModule entityId={ID} loadHistory={false} />, raw);

describe("HaBinarySensorModule", () => {
  it("maps the raw entity into the module in its device class's words, and sends nothing: a reading has no keys", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("off"));
    expect(live.container.querySelector(".fd-read-fig")?.textContent).toBe("SHUTClosed");
    expect(live.container.querySelector(".fd-key")).toBeNull();
    expect(live.callService).not.toHaveBeenCalled();
  });

  it("raises a leak to urgent from the store", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "on", attributes: { friendly_name: "Under the sink", device_class: "moisture" } } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-level")).toBe("urgent"));
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
