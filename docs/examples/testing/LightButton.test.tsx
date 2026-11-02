import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderConnected } from "@dashhaus/core/testing";
import { LightButton } from "./LightButton";

const entities = {
  "light.desk": { entity_id: "light.desk", state: "off", attributes: { friendly_name: "Desk" } },
};

describe("LightButton", () => {
  it("toggles the light through Home Assistant", async () => {
    const { calls } = renderConnected(<LightButton entityId="light.desk" />, entities);
    fireEvent.click(await screen.findByRole("button", { name: "Desk" }));
    expect(calls).toEqual([{ domain: "light", service: "toggle", data: { entity_id: "light.desk" } }]);
  });

  it("follows the entity as Home Assistant changes it", async () => {
    const { emitEntity } = renderConnected(<LightButton entityId="light.desk" />, entities);
    const button = await screen.findByRole("button", { name: "Desk" });
    act(() => emitEntity("light.desk", { state: "on" }));
    expect(button.getAttribute("aria-pressed")).toBe("true");
    act(() => emitEntity("light.desk", { state: "unavailable" }));
    expect(button).toHaveProperty("disabled", true);
  });
});
