import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SoundCard } from "./SoundCard";
import type { SoundEntity } from "@dashhaus/core/entities/sound/types";

const entity: SoundEntity = { entityId: "switch.bedroom", name: "Bedroom", area: "Upstairs", state: "on" };

describe("SoundCard", () => {
  it("is a state: no glow while on", () => {
    const { container } = render(<SoundCard entity={entity} onToggle={() => {}} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("state");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd sn");
  });

  it("toggles from the orb and the pill", () => {
    const onToggle = vi.fn();
    render(<SoundCard entity={entity} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
    fireEvent.click(screen.getByRole("button", { name: /^Bedroom: On/ }));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("says Unavailable and ignores the orb while unavailable", () => {
    const onToggle = vi.fn();
    render(<SoundCard entity={{ ...entity, state: "unavailable", lastSeen: "08:20" }} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText("Last seen 08:20")).toBeTruthy();
  });

  it("keeps one state cue in the compact row", () => {
    const { container } = render(<SoundCard entity={{ ...entity, state: "off" }} footprint="compact" onToggle={() => {}} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Off");
  });

  it("names the volume on the status line and sets it in the sheet only", () => {
    const onVolumeChange = vi.fn();
    const { container, rerender } = render(<SoundCard entity={{ ...entity, volume: 62 }} onToggle={() => {}} onVolumeChange={onVolumeChange} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Upstairs · Volume 62%");
    expect(screen.queryByRole("slider")).toBeNull();

    rerender(<SoundCard variant="sheet" entity={{ ...entity, state: "off", volume: 62 }} onToggle={() => {}} onVolumeChange={onVolumeChange} />);
    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider.getAttribute("aria-valuetext")).toBe("62 percent, sound off");
    fireEvent.change(slider, { target: { value: "30" } });
    expect(onVolumeChange).toHaveBeenCalledWith(30);
  });
});
