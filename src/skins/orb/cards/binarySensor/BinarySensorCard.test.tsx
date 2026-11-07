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

  it("leads with the warn marker for a leak, and keeps the figure in ink, never a glow", () => {
    const { container } = render(<BinarySensorCard entity={{ ...door, name: "Sink", deviceClass: "moisture" }} />);
    expect(screen.getByRole("img", { name: "Warning: Leak detected at Sink" })).toBeTruthy();
    expect(container.querySelector(".hd-area")?.textContent).toBe("Leak detected");
    expect(container.querySelector("article")?.getAttribute("data-glow")).toBeNull();
    expect(container.querySelector(".bs-f")?.hasAttribute("data-warn")).toBe(false);
    expect(container.querySelector(".hd-num")?.className).toBe("hd-num");
  });

  it("fills the slot in warn for smoke, the alarm and since when, with the status line plain", () => {
    const smoke: BinarySensorEntity = { ...door, name: "Hallway", area: "Upstairs", deviceClass: "smoke", lastChanged: "11:52" };
    const { container } = render(<BinarySensorCard entity={smoke} />);
    const pill = screen.getByRole("alert");
    expect(pill.className).toBe("hd-alarm");
    expect(pill.textContent).toBe("Smoke alarmSince 11:52");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Upstairs");
    expect(container.querySelector(".hd-alert-cue")).toBeNull();
    expect(container.querySelector(".bs-bar")).toBeNull();
    expect(container.querySelector("article")?.getAttribute("data-alert")).toBe("alarm");
    expect(container.querySelector("article")?.getAttribute("data-glow")).toBeNull();
  });

  it("keeps the alarm pill in a compact row, with the control or without it", () => {
    const smoke: BinarySensorEntity = { ...door, name: "Hallway", area: "Upstairs", deviceClass: "smoke", lastChanged: "11:52" };
    for (const showControl of [true, false]) {
      const { container, unmount } = render(<BinarySensorCard entity={smoke} footprint="compact" showControl={showControl} />);
      expect(container.querySelector(".hd-slot .hd-alarm")?.textContent).toBe("Smoke alarmSince 11:52");
      expect(container.querySelector(".hd-val")).toBeNull();
      expect(container.querySelector(".hd-sub")?.textContent).toBe("Smoke alarm");
      unmount();
    }
  });

  it("says a garage door left open as the cover card does: advisory, ahead of a low battery", () => {
    const { container } = render(<BinarySensorCard entity={{ ...door, name: "Garage", deviceClass: "garage_door", lastChanged: "18:30", battery: 3 }} />);
    expect(screen.getByRole("img", { name: "Warning: Garage has been open since 18:30" })).toBeTruthy();
    expect(container.querySelector(".hd-area")?.textContent).toBe("Open since 18:30");
    expect(container.querySelector("article")?.getAttribute("data-alert")).toBe("warn");
  });

  it("says since when beside the area in the sheet, and when before what the device is in the small print", () => {
    const { container, rerender } = render(<BinarySensorCard entity={{ ...door, battery: 64 }} variant="sheet" />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Hall · Since 11:31");
    rerender(<BinarySensorCard entity={{ ...door, battery: 9 }} variant="sheet" />);
    const facts = container.querySelectorAll(".hd-info > span");
    expect(facts[0]?.textContent).toBe("Last changed 11:31");
    expect(facts[1]?.textContent).toBe("Battery 9%, replace soon");
    expect(facts[1]?.querySelector(".hd-warn")).not.toBeNull();
  });

  it("warns of a low battery, but lets the state's own warning lead", () => {
    const { container, rerender } = render(<BinarySensorCard entity={{ ...door, state: "off", battery: 9 }} />);
    expect(screen.getByRole("img", { name: "Warning: battery 9% on Front door, replace soon" })).toBeTruthy();
    rerender(<BinarySensorCard entity={{ ...door, deviceClass: "moisture", battery: 9 }} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Leak detected");
  });

  it("hides the last state while unavailable, and says Unavailable on the status line", () => {
    const { container, rerender } = render(<BinarySensorCard entity={{ ...door, state: "unavailable", lastSeen: "08:20" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Unavailable");
    expect(screen.queryByText("Open")).toBeNull();
    rerender(<BinarySensorCard entity={{ ...door, state: "unavailable", lastSeen: "08:20" }} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Unavailable");
  });
});
