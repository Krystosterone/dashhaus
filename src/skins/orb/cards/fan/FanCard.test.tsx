import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FanCard } from "./FanCard";
import type { FanEntity } from "@dashhaus/core/entities/fan/types";

const tower: FanEntity = {
  entityId: "fan.bedroom", name: "Tower fan", area: "Bedroom", state: "on",
  supportsSpeed: true, speedCount: 3, percentage: 67,
  supportsPreset: true, presetModes: ["normal", "sleep"],
  supportsOscillate: true, oscillating: true,
};
const extractor: FanEntity = { entityId: "fan.bath", name: "Extractor", area: "Bathroom", state: "off", supportsSpeed: false };
const noop = () => {};

describe("FanCard", () => {
  it("is a state: no glow while on", () => {
    const { container } = render(<FanCard entity={tower} onToggle={noop} onPercentageChange={noop} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("state");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd fn");
  });

  it("sets the speed on the groove, one stop per speed", () => {
    const onPercentageChange = vi.fn();
    render(<FanCard entity={tower} onToggle={noop} onPercentageChange={onPercentageChange} />);
    const groove = screen.getByRole("slider", { name: "Tower fan speed" });
    expect(groove.getAttribute("aria-valuetext")).toBe("Speed 2 of 3");
    expect(groove.getAttribute("max")).toBe("3");
    fireEvent.keyDown(groove, { key: "ArrowRight" });
    expect(onPercentageChange).toHaveBeenLastCalledWith(100);
    fireEvent.keyDown(groove, { key: "Home" });
    expect(onPercentageChange).toHaveBeenLastCalledWith(33);
  });

  it("reads a stepless fan's speed in percent", () => {
    render(<FanCard entity={{ ...tower, speedCount: 100, percentage: 40 }} onToggle={noop} onPercentageChange={noop} />);
    expect(screen.getByRole("slider", { name: "Tower fan speed" }).getAttribute("aria-valuetext")).toBe("40 percent");
  });

  it("says the groove is off while the fan is off", () => {
    render(<FanCard entity={{ ...tower, state: "off", percentage: undefined }} onToggle={noop} onPercentageChange={noop} />);
    expect(screen.getByRole("slider", { name: "Tower fan speed" }).getAttribute("aria-valuetext")).toBe("Off");
  });

  it("toggles from the orb; a fan without speeds keeps the pill", () => {
    const onToggle = vi.fn();
    render(<FanCard entity={extractor} onToggle={onToggle} onPercentageChange={noop} />);
    expect(screen.queryByRole("slider")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Extractor" }));
    fireEvent.click(screen.getByRole("button", { name: /^Extractor: Off/ }));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("names its preset, or its sweep, on the status line", () => {
    const { container, rerender } = render(<FanCard entity={tower} onToggle={noop} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Bedroom · Oscillating");
    rerender(<FanCard entity={{ ...tower, presetMode: "sleep" }} onToggle={noop} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Bedroom · Sleep");
  });

  it("holds presets, oscillation and direction in the sheet only", () => {
    const onPresetChange = vi.fn();
    const onOscillateChange = vi.fn();
    const onDirectionChange = vi.fn();
    const entity: FanEntity = { ...tower, supportsDirection: true, direction: "forward" };
    const props = { entity, onToggle: noop, onPresetChange, onOscillateChange, onDirectionChange };
    const { rerender } = render(<FanCard {...props} />);
    expect(screen.queryByRole("group", { name: "Preset" })).toBeNull();
    rerender(<FanCard {...props} variant="sheet" />);
    fireEvent.click(screen.getByRole("button", { name: "Sleep" }));
    fireEvent.click(screen.getByRole("button", { name: "Off" }));
    fireEvent.click(screen.getByRole("button", { name: "Reverse" }));
    expect(onPresetChange).toHaveBeenCalledWith("sleep");
    expect(onOscillateChange).toHaveBeenCalledWith(false);
    expect(onDirectionChange).toHaveBeenCalledWith("reverse");
    expect(screen.getByText("3 speeds, presets, oscillates, reverses")).toBeTruthy();
  });

  it("says Unavailable and ignores the orb while unavailable", () => {
    const onToggle = vi.fn();
    render(<FanCard entity={{ ...tower, state: "unavailable", lastSeen: "08:20" }} variant="sheet" onToggle={onToggle} onPresetChange={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Tower fan" }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("group", { name: "Preset" })).toBeNull();
    expect(screen.getAllByText("Last seen 08:20").length).toBeGreaterThan(0);
  });

  it("keeps one state cue in the compact row", () => {
    const { container, rerender } = render(<FanCard entity={{ ...tower, state: "off", percentage: undefined }} footprint="compact" onToggle={noop} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Off");
    rerender(<FanCard entity={tower} footprint="compact" onToggle={noop} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Speed 2");
  });
});
