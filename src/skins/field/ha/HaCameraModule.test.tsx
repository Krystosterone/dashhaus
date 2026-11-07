import { act, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaCameraModule } from "./HaCameraModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/camera.json";

const raw = fixture as HassEntities;
const ID = "camera.front_door";
const renderLive = (props: { still?: boolean } = {}) => renderConnected(<HaCameraModule entityId={ID} {...props} />, raw);

describe("HaCameraModule", () => {
  it("draws the camera's state and its still's window, and sends nothing to Home Assistant", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("idle"));
    expect(live.container.querySelector(".fd-cm-body .fd-pic")).not.toBeNull();
    const before = live.callService.mock.calls.length;
    await act(async () => {
      fireEvent.click(live.getByRole("button", { name: "Front door: Idle. Open details" }));
      await Promise.resolve();
    });
    expect(live.callService.mock.calls.length - before).toBe(0);
  });

  it("draws no window with its stills switched off", async () => {
    const live = renderLive({ still: false });
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("idle"));
    expect(live.container.querySelector(".fd-pic")).toBeNull();
  });

  it("follows the store when the entity stops responding, and draws no frame", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
    expect(live.container.querySelector(".fd-pic")?.getAttribute("data-status")).toBe("unavailable");
  });
});
