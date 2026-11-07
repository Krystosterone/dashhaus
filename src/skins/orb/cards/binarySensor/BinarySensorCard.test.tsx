import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BinarySensorCard } from "./BinarySensorCard";
import type { BinarySensorEntity } from "@dashhaus/core/entities/binarySensor/types";

const door: BinarySensorEntity = { entityId: "binary_sensor.front_door", name: "Front door", area: "Hall", state: "on", deviceClass: "door", lastChanged: "11:31" };

describe("BinarySensorCard", () => {
  it("is a reading: no glow, a bare icon, its class prefix", () => {
    const { container } = render(<BinarySensorCard entity={door} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd bs");
    expect(container.querySelector(".hd-orb--static")).not.toBeNull();
  });

  it("says the state in its device class's words, and since when, and opens details from it", () => {
    const onOpenDetails = vi.fn();
    render(<BinarySensorCard entity={door} onOpenDetails={onOpenDetails} />);
    screen.getByRole("button", { name: "Front door: Open, since 11:31. Open details" }).click();
    expect(onOpenDetails).toHaveBeenCalled();
  });

  it("keeps an open door a state: the area, no warning", () => {
    const { container } = render(<BinarySensorCard entity={door} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Hall");
    expect(container.querySelector("article")?.getAttribute("data-alert")).toBeNull();
  });

  it("leads with the warn marker for smoke and a leak, never a glow", () => {
    const { container, rerender } = render(<BinarySensorCard entity={{ ...door, name: "Hallway", deviceClass: "smoke" }} />);
    expect(screen.getByRole("img", { name: "Alert: Smoke detected at Hallway" })).toBeTruthy();
    expect(container.querySelector(".hd-area")?.textContent).toBe("Smoke detected");
    expect(container.querySelector("article")?.getAttribute("data-glow")).toBeNull();
    rerender(<BinarySensorCard entity={{ ...door, name: "Sink", deviceClass: "moisture" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Leak detected");
    expect(container.querySelector(".bs-f")?.textContent).toBe("Wet");
  });

  it("warns of a low battery, but lets the state's own warning lead", () => {
    const { container, rerender } = render(<BinarySensorCard entity={{ ...door, state: "off", battery: 9 }} />);
    expect(screen.getByRole("img", { name: "Warning: battery 9% on Front door, replace soon" })).toBeTruthy();
    rerender(<BinarySensorCard entity={{ ...door, deviceClass: "smoke", battery: 9 }} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Smoke detected");
  });

  it("hides the last state while unavailable", () => {
    const { container } = render(<BinarySensorCard entity={{ ...door, state: "unavailable", lastSeen: "08:20" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Unavailable");
    expect(screen.queryByText("Open")).toBeNull();
  });
});
