import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SoundModule } from "./SoundModule";
import type { SoundModuleProps } from "./SoundModule";
import { SOUND_SEEDS } from "@dashhaus/core/seeds/sound";

/*
 * What every field module does, whatever it is: its keys (a control's; a reading has none) press, a lit LED says on,
 * and unavailable blanks the screen and lays every key flat. The frame (footprints, details) is ModuleFrame's, tested
 * in shared/ui.test.tsx; test what this sound itself does here.
 */
const draw = (seed: keyof typeof SOUND_SEEDS, footprint?: "compact" | "standard", props: Partial<SoundModuleProps> = {}) => {
  const onToggle = vi.fn();
  const onVolumeChange = vi.fn();
  const { container } = render(
    <SoundModule
      entity={SOUND_SEEDS[seed].entity}
      footprint={footprint}
      onToggle={onToggle}
      onVolumeChange={onVolumeChange}
      {...props}
    />,
  );
  return { container, onToggle, onVolumeChange, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-key")] };
};

describe("SoundModule", () => {
  it("presses each of its keys once, and lights their LEDs while it's on", () => {
    const { container, keys, onToggle } = draw("on");
    const on = container.querySelector(".fd-module")?.getAttribute("data-state") === "on";
    for (const key of keys) {
      expect(key.getAttribute("aria-pressed")).toBe(String(on));
      fireEvent.click(key);
    }
    expect(onToggle).toHaveBeenCalledTimes(keys.length);
  });

  it("blanks the screen while unavailable, says when it was last seen, and lays every key flat with no state word", () => {
    const { container, keys } = draw("unavailable");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
    // Flat but still focusable, so a hold opens the details.
    expect(keys.every((key) => key.getAttribute("aria-disabled") === "true" && !key.disabled)).toBe(true);
    expect(container.querySelector(".fd-key-cap")).toBeNull();
  });

  it("leads a compact row with its key, or a reading's glyph", () => {
    expect(draw("on", "compact").container.querySelector(".fd-module > .fd-key, .fd-module > .fd-glyph")).not.toBeNull();
  });

  it("leads the screen with the volume while it plays, and keeps the volume to the panel", () => {
    const { container } = draw("on");
    expect(container.querySelector(".fd-read")?.textContent).toBe("62%");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Playing/);
    expect(container.querySelector(".fd-pict")?.getAttribute("data-param")).toBe("a");
    // A stray tap beside a sleeping baby must not jump the volume: the module carries no fader.
    expect(container.querySelector(".fd-fader")).toBeNull();
  });

  it("says OFF with the volume on the meta line while off", () => {
    const { container } = draw("off");
    expect(container.querySelector(".fd-read")?.textContent).toBe("OFF");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Volume 62%/);
  });

  it("says ON, in neutral ink, for a sound with no volume", () => {
    const { container } = draw("noVolume");
    expect(container.querySelector(".fd-read")?.textContent).toBe("ON");
    expect(container.querySelector(".fd-pict")?.getAttribute("data-param")).toBe("neutral");
  });

  it("sets the volume from the panel's fader, unlit while off, and never switches the sound", () => {
    const { onToggle, onVolumeChange } = draw("off", "standard", { defaultOpen: true });
    const slider = screen.getByRole("slider", { name: "White noise volume", hidden: true });
    expect(slider.closest(".fd-fader")?.getAttribute("data-lit")).toBe("false");
    fireEvent.change(slider, { target: { value: "40" } });
    expect(onVolumeChange).toHaveBeenCalledWith(40);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("has no volume fader without a volume, or while unavailable", () => {
    draw("noVolume", "standard", { defaultOpen: true });
    expect(screen.queryByRole("slider", { hidden: true })).toBeNull();
    draw("unavailable", "standard", { defaultOpen: true });
    expect(screen.queryByRole("slider", { hidden: true })).toBeNull();
  });
});
