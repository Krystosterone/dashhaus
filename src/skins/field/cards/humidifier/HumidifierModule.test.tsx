import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HumidifierModule } from "./HumidifierModule";
import type { HumidifierModuleProps } from "./HumidifierModule";
import { HUMIDIFIER_SEEDS } from "./demo/useDemoHumidifier";

/*
 * What every field module does, whatever it is: its keys (a control's; a reading has none) press, a lit LED says on,
 * and unavailable blanks the screen and lays every key flat. The frame (footprints, details) is ModuleFrame's, tested
 * in shared/ui.test.tsx; test what this humidifier itself does here.
 */
const draw = (seed: keyof typeof HUMIDIFIER_SEEDS, footprint?: "compact" | "standard", props: Partial<HumidifierModuleProps> = {}) => {
  const onToggle = vi.fn();
  const onTargetChange = vi.fn();
  const onModeChange = vi.fn();
  const { container } = render(
    <HumidifierModule
      entity={HUMIDIFIER_SEEDS[seed].entity}
      footprint={footprint}
      onToggle={onToggle}
      onTargetChange={onTargetChange}
      onModeChange={onModeChange}
      {...props}
    />,
  );
  return { container, onToggle, onTargetChange, onModeChange, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-key")] };
};

describe("HumidifierModule", () => {
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
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("leads a compact row with its key, or a reading's glyph", () => {
    expect(draw("on", "compact").container.querySelector(".fd-module > .fd-key, .fd-module > .fd-glyph")).not.toBeNull();
  });

  it("leads with the room's humidity, then what the target does and what the unit is doing", () => {
    const { container } = draw("on");
    expect(container.querySelector(".fd-read")?.textContent).toBe("38%");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("0");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Humidify to 45%Humidifying");
  });

  it("sets the target on its fader, in whole percent between the unit's bounds", () => {
    const { onTargetChange } = draw("on");
    const fader = screen.getByRole("slider", { name: "Bedroom humidifier target humidity" }) as HTMLInputElement;
    expect([fader.min, fader.max, fader.value]).toEqual(["30", "80", "45"]);
    expect(fader.getAttribute("aria-valuetext")).toBe("45 percent");
    fireEvent.change(fader, { target: { value: "52" } });
    expect(onTargetChange).toHaveBeenCalledWith(52);
  });

  it("says a dehumidifier dries to its target", () => {
    expect(draw("dehumidifier").container.querySelector(".fd-meta")?.textContent).toBe("Dry to 50%Idle");
  });

  it("is off with the room on its meta line and one wide key to turn it on, and no fader", () => {
    const { container } = draw("off");
    expect(container.querySelector(".fd-read")?.textContent).toBe("OFF");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Off47% room");
    expect(screen.queryByRole("slider")).toBeNull();
    expect(container.querySelector(".fd-key-cap")?.textContent).toBe("Turn on");
  });

  it("says ON with its mode on the key when it has no target or room reading, never a made-up number", () => {
    const { container } = draw("modeOnly");
    expect(container.querySelector(".fd-read")?.textContent).toBe("ON");
    expect(container.querySelector(".fd-key-cap")?.textContent).toBe("Sleep");
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("has no fader without onTargetChange", () => {
    draw("on", "standard", { onTargetChange: undefined });
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("steps the target one percent in the panel, and stops at the unit's bound", () => {
    const { onTargetChange } = draw("long", "standard", { defaultOpen: true });
    fireEvent.click(screen.getByRole("button", { name: "Lower target to 99%", hidden: true }));
    expect(onTargetChange).toHaveBeenCalledWith(99);
    expect(screen.getByRole("button", { name: "Raise target to 100%", hidden: true }).getAttribute("aria-disabled")).toBe("true");
  });

  it("chooses a mode in the panel, the current one announced as pressed", () => {
    const { onModeChange } = draw("on", "standard", { defaultOpen: true });
    expect(screen.getByRole("button", { name: "Set mode to Normal", hidden: true }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Set mode to Boost", hidden: true }));
    expect(onModeChange).toHaveBeenCalledWith("boost");
  });

  it("draws no mode keys for a unit without modes", () => {
    draw("dehumidifier", "standard", { defaultOpen: true });
    expect(screen.queryByRole("button", { name: /^Set mode to/, hidden: true })).toBeNull();
  });
});
