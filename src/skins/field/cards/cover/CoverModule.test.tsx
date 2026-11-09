import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SETTLE_MS } from "@dashhaus/core/hooks";
import { CoverModule } from "./CoverModule";
import type { CoverModuleProps } from "./CoverModule";
import { COVER_SEEDS, COVER_WORST_CASE } from "@dashhaus/core/seeds/cover";
import type { CoverEntity } from "@dashhaus/core/entities/cover/types";

/*
 * What every field module does, whatever it is: its keys (a control's; a reading has none) press, a lit LED says on,
 * and unavailable blanks the screen and lays every key flat. The frame (footprints, details) is ModuleFrame's, tested
 * in shared/ui.test.tsx; test what this cover itself does here.
 */
const draw = (seed: keyof typeof COVER_SEEDS | CoverEntity, footprint?: "compact" | "standard", props: Partial<CoverModuleProps> = {}) => {
  const handlers = { onOpenCover: vi.fn(), onCloseCover: vi.fn(), onStopCover: vi.fn(), onSetPosition: vi.fn(), onSetTilt: vi.fn() };
  const { container, unmount } = render(
    <CoverModule entity={typeof seed === "string" ? COVER_SEEDS[seed].entity : seed} footprint={footprint} {...handlers} {...props} />,
  );
  return { container, unmount, ...handlers, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-key")] };
};

HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
afterEach(() => { vi.useRealTimers(); });

const longDoor = COVER_WORST_CASE.find(({ entity }) => entity.entityId === "cover.garage_side")!.entity;
const stuckGate = COVER_WORST_CASE.find(({ entity }) => entity.entityId === "cover.gate")!.entity;

describe("CoverModule", () => {
  it("presses each of its keys once, says what a press does, and lights their LEDs while it's open", () => {
    const { container, keys, onCloseCover } = draw("curtains");
    for (const key of keys) {
      expect(key.getAttribute("aria-label")).toBe("Close Curtains");
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

  it("draws an unknown cover as drivable: blank segments and Unknown, every key live, and the key opens it", () => {
    const { container, keys, onOpenCover, onCloseCover, onStopCover } = draw("unknown", "standard", { defaultOpen: true });
    expect(container.querySelector(".fd-module .fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(container.querySelector(".fd-module .fd-meta")?.textContent).toMatch(/^Unknown/);
    expect(keys.some((key) => key.getAttribute("aria-disabled") === "true")).toBe(false);
    // The module's key and the panel's are the same: each opens it.
    const opens = screen.getAllByRole("button", { name: "Open Study blind", hidden: true });
    expect(opens.length).toBeGreaterThan(0);
    fireEvent.click(opens[0]);
    expect(onOpenCover).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Study blind, close", hidden: true }));
    fireEvent.click(screen.getByRole("button", { name: "Study blind, stop", hidden: true }));
    expect(onCloseCover).toHaveBeenCalledOnce();
    expect(onStopCover).toHaveBeenCalledOnce();
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
    expect(keys[0].getAttribute("aria-label")).toBe("Open Roller shade");
    expect(keys[0].querySelector(".fd-led")?.getAttribute("data-lit")).toBe("false");
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
    fireEvent.click(screen.getByRole("button", { name: `Close ${COVER_WORST_CASE[0].entity.name}` }));
    expect(onCloseCover).toHaveBeenCalledOnce();
  });

  it("says OPEN for a garage door with no position, warns it was left open, and spans the key with what a press does", () => {
    const { container } = draw("garage");
    expect(container.querySelector(".fd-read")?.textContent).toBe("OPEN");
    // spec/cards.md → the same physical thing gets the same warning: `Open` behind the marker over since when, as a
    // garage door's binary sensor says it.
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Warning: OpenSince 10:20");
    expect(container.querySelector(".fd-key-cap")?.textContent).toBe("Close");
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("never moves a garage door on a press: the module's key and the row's open the panel on the question, as Unlock does", () => {
    for (const footprint of ["standard", "compact"] as const) {
      const { onCloseCover, unmount } = draw("garage", footprint);
      fireEvent.click(screen.getByRole("button", { name: "Close Garage door: asks first" }));
      expect(onCloseCover).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "Garage door details" })).toBeTruthy();
      expect(screen.getByRole("group", { name: "Close Garage door?", hidden: true })).toBeTruthy();
      unmount();
    }
  });

  it("answers in the panel: Cancel focused, a press too soon ignored, the yes naming what it moves, in place of the controls", async () => {
    vi.useFakeTimers();
    const { onCloseCover } = draw(longDoor, "standard", { defaultAction: "close" });
    const panel = document.querySelector("dialog")!;
    expect(screen.getByText("Close Garage side door to the back garden?")).toBeTruthy();
    expect(screen.getByText("It closes now. Check nothing is in its way.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel", hidden: true }).hasAttribute("data-autofocus")).toBe(true);
    // The question is the panel's one control: no key, no Move group, no facts while it stands.
    expect(panel.querySelector(".fd-cv-row, .fd-info")).toBeNull();
    expect(screen.queryByRole("group", { name: "Move", hidden: true })).toBeNull();
    const yes = screen.getByRole("button", { name: "Close door, Garage side door to the back garden", hidden: true });
    expect(yes.textContent).toContain("Close door");
    fireEvent.click(yes);
    expect(onCloseCover).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    await act(async () => { fireEvent.click(yes); });
    expect(onCloseCover).toHaveBeenCalledOnce();
    expect(screen.queryByText("Close Garage side door to the back garden?")).toBeNull();
  });

  it("opens the panel bare on a press and hold, as on every module, and Cancel moves nothing", () => {
    vi.useFakeTimers();
    const { onCloseCover } = draw("garage");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Close Garage door: asks first" }), { button: 0 });
    act(() => { vi.advanceTimersByTime(450); });
    expect(onCloseCover).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Garage door details" })).toBeTruthy();
    expect(screen.queryByText("Close Garage door?")).toBeNull();
    expect(screen.getByText("Opening and closing ask first.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Garage door, close: asks first", hidden: true }));
    expect(screen.getByText("Close Garage door?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel", hidden: true }));
    expect(onCloseCover).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Move", hidden: true })).toBeTruthy();
  });

  it("shows a door's position and never sets it: no fader and no quick positions, on the module or in the panel", () => {
    const { container, onSetPosition } = draw(longDoor, undefined, { defaultOpen: true });
    expect(container.querySelector(".fd-read")?.textContent).toBe("100%");
    expect(screen.queryAllByRole("slider", { hidden: true })).toHaveLength(0);
    expect(screen.queryByRole("group", { name: "Quick positions", hidden: true })).toBeNull();
    expect(screen.getByRole("group", { name: "Move", hidden: true })).toBeTruthy();
    expect(onSetPosition).not.toHaveBeenCalled();
  });

  it("stops a garage door or gate on one press, and lays its key flat on the way where it can't be stopped", () => {
    const stopping = draw("gate");
    fireEvent.click(screen.getByRole("button", { name: "Stop Driveway gate" }));
    expect(stopping.onStopCover).toHaveBeenCalledOnce();
    stopping.unmount();
    const { keys, onCloseCover, onOpenCover } = draw({ ...stuckGate, state: "closing" });
    expect(keys[0].getAttribute("aria-label")).toBe("Gate, closing");
    expect(keys[0].getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(keys[0]);
    expect(onCloseCover).not.toHaveBeenCalled();
    expect(onOpenCover).not.toHaveBeenCalled();
    expect(screen.queryByText(/^(Open|Close) Gate\?$/)).toBeNull();
  });

  it("says a gate that can't stop can't be stopped from here", () => {
    draw(stuckGate, "standard", { defaultAction: "close" });
    expect(screen.getByText("It closes now. Check nothing is in its way. It can't be stopped from here.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close gate, Gate", hidden: true })).toBeTruthy();
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
    const { onCloseCover } = draw({ ...COVER_SEEDS.garage.entity, entityId: "cover.attic_hatch", name: "Attic hatch", deviceClass: "window" }, "standard", { defaultOpen: true });
    const key = (name: string) => screen.getByRole("button", { name, hidden: true }) as HTMLButtonElement;
    expect(key("Attic hatch, open").getAttribute("aria-disabled")).toBe("true");
    expect(key("Attic hatch, stop").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(key("Attic hatch, close"));
    expect(onCloseCover).toHaveBeenCalledOnce();
  });

  it("asks first from the panel's Move group for a garage door, laying flat what can't act", () => {
    const { onCloseCover } = draw("garage", "standard", { defaultOpen: true });
    const key = (name: string) => screen.getByRole("button", { name, hidden: true }) as HTMLButtonElement;
    expect(key("Garage door, open: asks first").getAttribute("aria-disabled")).toBe("true");
    expect(key("Garage door, stop").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(key("Garage door, close: asks first"));
    expect(onCloseCover).not.toHaveBeenCalled();
    expect(screen.getByText("Close Garage door?")).toBeTruthy();
  });

  it("asks before any key moves a garage door whose place isn't known", () => {
    const { onOpenCover, onCloseCover } = draw({ ...COVER_SEEDS.garage.entity, state: "unknown" }, "standard", { defaultOpen: true });
    const key = (name: string) => screen.getByRole("button", { name, hidden: true }) as HTMLButtonElement;
    for (const name of ["Garage door, close: asks first", "Garage door, open: asks first"]) expect(key(name).getAttribute("aria-disabled")).toBeNull();
    fireEvent.click(key("Garage door, open: asks first"));
    expect(screen.getByText("Open Garage door?")).toBeTruthy();
    expect(screen.getByText("It opens now, and anyone outside can come in. Where it is isn't known.")).toBeTruthy();
    expect(onOpenCover).not.toHaveBeenCalled();
    expect(onCloseCover).not.toHaveBeenCalled();
  });

});
