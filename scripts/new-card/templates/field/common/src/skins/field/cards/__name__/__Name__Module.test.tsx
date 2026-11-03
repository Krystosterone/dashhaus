import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it__vi__ } from "vitest";
import { __Name__Module } from "./__Name__Module";
import { __CONST___SEEDS } from "./demo/__seedFile__";

/*
 * What every field module does, whatever it is: its keys (a control's; a reading has none) press, a lit LED says on,
 * what asks first never acts on one press, and unavailable blanks the screen and lays every key flat, still focusable
 * so a hold opens the details (spec/field.md → Unavailable). The frame (footprints, details) is ModuleFrame's, tested
 * in shared/ui.test.tsx; test what this __label__ itself does here.
 */
const draw = (seed: keyof typeof __CONST___SEEDS, footprint?: "compact" | "standard") => {
  const handlers = { __testHandlers__ };
  const { container } = render(<__Name__Module entity={__CONST___SEEDS[seed].entity} footprint={footprint} {...handlers} />);
  return { container, handlers, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-module .fd-key")] };
};

describe("__Name__Module", () => {
  it("presses each of its keys once, lights a latching key's LED while it's on, and never acts on what asks first", () => {
    const { container, keys, handlers } = draw("__firstSeed__");
    const on = container.querySelector(".fd-module")?.getAttribute("data-state") === "on";
    expect(keys.length).toBe(Object.keys(handlers).length);
    for (const key of keys) {
      if (key.hasAttribute("aria-pressed")) expect(key.getAttribute("aria-pressed")).toBe(String(on));
      fireEvent.click(key);
    }
__testExpect__
  });

__guardedTest__
  it("blanks the screen while unavailable, says when it was last seen, and lays every key flat with no state word", () => {
    const { container, keys, handlers } = draw("__unavailableSeed__");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
    // Flat, not disabled: it keeps its focus and its hold, so the details still open; a press does nothing.
    for (const key of keys) {
      expect(key.disabled).toBe(false);
      expect(key.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(key);
    }
    for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled();
    expect(container.querySelector(".fd-key-cap")).toBeNull();
  });

  it("leads a compact row with its key, or a reading's glyph", () => {
    expect(draw("__firstSeed__", "compact").container.querySelector(".fd-module > .fd-key, .fd-module > .fd-glyph")).not.toBeNull();
  });
});
