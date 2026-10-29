import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CoverModule } from "./CoverModule";
import type { CoverModuleProps } from "./CoverModule";
import { COVER_SEEDS, COVER_WORST_CASE } from "./demo/useDemoCover";
import type { CoverEntity } from "../../../../domains/cover/types";

/*
 * What every field module does, whatever it is: its keys (a control's; a reading has none) press, a lit LED says on,
 * and unavailable blanks the screen and lays every key flat. The frame (footprints, details) is ModuleFrame's, tested
 * in shared/ui.test.tsx; test what this cover itself does here.
 */
const draw = (seed: keyof typeof COVER_SEEDS | CoverEntity, footprint?: "compact" | "standard", props: Partial<CoverModuleProps> = {}) => {
  const handlers = { onOpenCover: vi.fn(), onCloseCover: vi.fn(), onStopCover: vi.fn(), onSetPosition: vi.fn(), onSetTilt: vi.fn() };
  const { container } = render(
    <CoverModule entity={typeof seed === "string" ? COVER_SEEDS[seed].entity : seed} footprint={footprint} {...handlers} {...props} />,
  );
  return { container, ...handlers, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-key")] };
};

describe("CoverModule", () => {
  it("presses each of its keys once, and lights their LEDs while it's open", () => {
    const { container, keys, onCloseCover } = draw("curtains");
    for (const key of keys) {
      expect(key.getAttribute("aria-pressed")).toBe("true");
      expect(key.querySelector(".fd-led")?.getAttribute("data-lit")).toBe("true");
      fireEvent.click(key);
    }
    expect(onCloseCover).toHaveBeenCalledTimes(keys.length);
    expect(container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("open");
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
    expect(draw("curtains", "compact").container.querySelector(".fd-module > .fd-key, .fd-module > .fd-glyph")).not.toBeNull();
  });

  it("leads with how open it is, then its state and since when", () => {
    const { container } = draw("curtains");
    expect(container.querySelector(".fd-read")?.textContent).toBe("70%");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("0");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("OpenSince 07:30");
  });

  it("says a closed cover is 0% open, and opens it from the key", () => {
    const { container, keys, onOpenCover } = draw("shade");
    expect(container.querySelector(".fd-read")?.textContent).toBe("0%");
    expect(keys[0].getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(keys[0]);
    expect(onOpenCover).toHaveBeenCalledOnce();
  });

  it("moves it on its fader, with magnetic ends and its position in words", () => {
    const { onSetPosition } = draw("curtains");
    const fader = screen.getByRole("slider", { name: "Curtains position" }) as HTMLInputElement;
    expect([fader.min, fader.max, fader.value]).toEqual(["0", "100", "70"]);
    expect(fader.getAttribute("aria-valuetext")).toBe("70% open");
    fireEvent.change(fader, { target: { value: "40" } });
    expect(onSetPosition).toHaveBeenCalledWith(40);
  });

  it("stops it on the way from the key, and says where it's going", () => {
    const { container, onStopCover } = draw("moving");
    expect(container.querySelector(".fd-legend")?.textContent).toBe("Closing");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Closing");
    fireEvent.click(screen.getByRole("button", { name: "Stop Patio curtains" }));
    expect(onStopCover).toHaveBeenCalledOnce();
  });

  it("keeps the key opening and closing on the way when the cover can't stop", () => {
    const { onCloseCover } = draw(COVER_WORST_CASE[0].entity);
    fireEvent.click(screen.getByRole("button", { name: COVER_WORST_CASE[0].entity.name }));
    expect(onCloseCover).toHaveBeenCalledOnce();
  });

  it("says OPEN for a garage door with no position, warns it was left open, and spans the key with its state", () => {
    const { container } = draw("garage");
    expect(container.querySelector(".fd-read")?.textContent).toBe("OPEN");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Warning: Open since 10:20");
    expect(container.querySelector(".fd-key-cap")?.textContent).toBe("Open");
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("puts a door's warning in place of the area on a compact row", () => {
    const { container } = draw("garage", "compact");
    expect(container.querySelector(".fd-area")?.textContent).toBe("Warning: Open since 10:20");
  });

  it("blanks the figure of a cover with no position on its way, never guessing where it is", () => {
    const { container } = draw("gate");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(container.querySelector(".fd-read")?.textContent).toBe("Closing");
    expect(container.querySelector(".fd-key-cap")?.textContent).toBe("Stop");
  });

  it("moves to a quick position in the panel, the current one announced as pressed", () => {
    const { onSetPosition } = draw("shade", "standard", { defaultOpen: true });
    expect(screen.getByRole("button", { name: "Closed", hidden: true }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Half open", hidden: true }));
    expect(onSetPosition).toHaveBeenCalledWith(50);
  });

  it("tilts a blind's slats in the panel", () => {
    const { onSetTilt } = draw("blind", "standard", { defaultOpen: true });
    const slats = screen.getByRole("slider", { name: "Blind slats", hidden: true });
    fireEvent.change(slats, { target: { value: "80" } });
    expect(onSetTilt).toHaveBeenCalledWith(80);
  });

  it("closes, stops and opens a cover with no position from the panel, laying flat what can't act", () => {
    const { onCloseCover } = draw("garage", "standard", { defaultOpen: true });
    const key = (name: string) => screen.getByRole("button", { name, hidden: true }) as HTMLButtonElement;
    expect(key("Garage door, open").getAttribute("aria-disabled")).toBe("true");
    expect(key("Garage door, stop").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(key("Garage door, close"));
    expect(onCloseCover).toHaveBeenCalledOnce();
  });
});
