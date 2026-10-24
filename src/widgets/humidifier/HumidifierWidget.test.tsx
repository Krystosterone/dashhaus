import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HumidifierWidget } from "./HumidifierWidget";
import type { HumidifierEntity } from "./types";

const entity: HumidifierEntity = {
  entityId: "humidifier.bedroom", name: "Bedroom", area: "Upstairs", state: "on", action: "humidifying",
  currentHumidity: 38, targetHumidity: 45, minHumidity: 30, maxHumidity: 80, mode: "normal", modes: ["normal", "eco"],
};

describe("HumidifierWidget", () => {
  it("is a state: no glow while humidifying", () => {
    const { container } = render(<HumidifierWidget entity={entity} onToggle={() => {}} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("state");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd hu");
  });

  it("gives the room's humidity and what it is doing on the status line", () => {
    const { container } = render(<HumidifierWidget entity={entity} onToggle={() => {}} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("38% now · Humidifying");
  });

  it("steps the target by whole percent, within its bounds", () => {
    const onTargetChange = vi.fn();
    const { rerender } = render(<HumidifierWidget entity={entity} onToggle={() => {}} onTargetChange={onTargetChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Raise to 46%" }));
    fireEvent.click(screen.getByRole("button", { name: "Lower to 44%" }));
    expect(onTargetChange.mock.calls).toEqual([[46], [44]]);
    rerender(<HumidifierWidget entity={{ ...entity, targetHumidity: 80 }} onToggle={() => {}} onTargetChange={onTargetChange} />);
    expect((screen.getByRole("button", { name: "Raise to 80%" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("says Dry to for a dehumidifier", () => {
    render(<HumidifierWidget entity={{ ...entity, kind: "dehumidifier", action: "drying" }} onToggle={() => {}} onTargetChange={() => {}} />);
    expect(screen.getByText("Dry to")).toBeTruthy();
  });

  it("falls back to an on pill without a settable target", () => {
    const onToggle = vi.fn();
    render(<HumidifierWidget entity={{ ...entity, targetHumidity: undefined }} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Bedroom: On · Normal" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("toggles from the orb and the Off pill", () => {
    const onToggle = vi.fn();
    render(<HumidifierWidget entity={{ ...entity, state: "off", action: "off" }} onToggle={onToggle} onTargetChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
    fireEvent.click(screen.getByRole("button", { name: "Bedroom: Off, turn on" }));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("says Unavailable and ignores the orb while unavailable", () => {
    const onToggle = vi.fn();
    render(<HumidifierWidget entity={{ ...entity, state: "unavailable", lastSeen: "08:20" }} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText("Last seen 08:20")).toBeTruthy();
  });

  it("keeps one state cue in the compact row", () => {
    const { container } = render(<HumidifierWidget entity={{ ...entity, state: "off" }} footprint="compact" onToggle={() => {}} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("38% · Off");
  });

  it("offers its modes in the sheet", () => {
    const onModeChange = vi.fn();
    render(<HumidifierWidget entity={entity} variant="sheet" onToggle={() => {}} onModeChange={onModeChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Eco" }));
    expect(onModeChange).toHaveBeenCalledWith("eco");
  });
});
