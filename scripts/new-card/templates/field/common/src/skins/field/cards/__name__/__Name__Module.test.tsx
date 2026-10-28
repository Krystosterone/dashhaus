import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { __Name__Module } from "./__Name__Module";
import { __CONST___SEEDS } from "./demo/__seedFile__";

/*
 * What every field module does, whatever it is: its keys (a control's; a reading has none) press, a lit LED says on,
 * and unavailable blanks the screen and lays every key flat. The frame (footprints, details) is ModuleFrame's, tested
 * in shared/ui.test.tsx; test what this __label__ itself does here.
 */
const draw = (seed: keyof typeof __CONST___SEEDS, footprint?: "compact" | "standard") => {
  const onToggle = vi.fn();
  const { container } = render(
    <__Name__Module
      entity={__CONST___SEEDS[seed].entity}
      footprint={footprint}
      __testProps__
    />,
  );
  return { container, onToggle, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-key")] };
};

describe("__Name__Module", () => {
  it("presses each of its keys once, and lights their LEDs while it's on", () => {
    const { container, keys, onToggle } = draw("__firstSeed__");
    const on = container.querySelector(".fd-module")?.getAttribute("data-state") === "on";
    for (const key of keys) {
      expect(key.getAttribute("aria-pressed")).toBe(String(on));
      fireEvent.click(key);
    }
    expect(onToggle).toHaveBeenCalledTimes(keys.length);
  });

  it("blanks the screen while unavailable, says when it was last seen, and lays every key flat", () => {
    const { container, keys } = draw("__unavailableSeed__");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
    expect(keys.every((key) => key.disabled)).toBe(true);
  });

  it("leads a compact row with its key, or a reading's glyph", () => {
    expect(draw("__firstSeed__", "compact").container.querySelector(".fd-module > .fd-key, .fd-module > .fd-glyph")).not.toBeNull();
  });
});
