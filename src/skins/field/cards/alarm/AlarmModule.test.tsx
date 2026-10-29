import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlarmModule } from "./AlarmModule";
import type { AlarmModuleProps } from "./AlarmModule";
import { ALARM_SEEDS, ALARM_WORST_CASE } from "./demo/useDemoAlarm";
import type { AlarmEntity } from "../../../../domains/alarm/types";

/*
 * What every field module does, whatever it is: its keys (a control's; a reading has none) press, a lit LED says on,
 * and unavailable blanks the screen and lays every key flat. The frame (footprints, details) is ModuleFrame's, tested
 * in shared/ui.test.tsx; test what this alarm itself does here. jsdom applies no container queries, so a module draws
 * both its mode keys and the one key that stands in for them where they don't fit.
 */
const draw = (seed: keyof typeof ALARM_SEEDS | AlarmEntity, footprint?: "compact" | "standard", props: Partial<AlarmModuleProps> = {}) => {
  const handlers = { onArm: vi.fn(() => true), onDisarm: vi.fn(() => true) };
  const { container } = render(
    <AlarmModule entity={typeof seed === "string" ? { ...ALARM_SEEDS[seed].entity, changedAt: undefined } : seed} footprint={footprint} {...handlers} {...props} />,
  );
  return { container, ...handlers, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-module .fd-key")] };
};
const meta = (container: HTMLElement) => container.querySelector(".fd-module .fd-meta")?.textContent;
const read = (container: HTMLElement) => container.querySelector(".fd-module .fd-read")?.textContent;
/** A key in the open panel, by its label. */
const panelKey = (name: string) => screen.getByRole("button", { name, hidden: true });

describe("AlarmModule", () => {
  it("says OFF and since when while disarmed, Off chosen among its mode keys", () => {
    const { container } = draw("disarmed");
    expect(read(container)).toBe("OFF");
    expect(meta(container)).toBe("DisarmedSince 07:02");
    const bank = container.querySelector(".fd-module .fd-al-bank")!;
    expect([...bank.querySelectorAll(".fd-key")].map((k) => k.getAttribute("aria-label"))).toEqual(["Disarm", "Arm home", "Arm away", "Arm night"]);
    expect(bank.querySelector('[aria-pressed="true"]')?.getAttribute("aria-label")).toBe("Disarm");
  });

  it("says ON and the mode while armed, its LED lit and the mode chosen", () => {
    const { container } = draw("away");
    expect(read(container)).toBe("ON");
    expect(meta(container)).toBe("Armed awaySince 08:12");
    expect(container.querySelector('.fd-module .fd-al-bank [aria-pressed="true"]')?.getAttribute("aria-label")).toBe("Arm away");
    const one = container.querySelector<HTMLButtonElement>(".fd-module .fd-al-alt .fd-key")!;
    expect(one.getAttribute("aria-label")).toBe("Disarm Alarm");
    expect(one.querySelector(".fd-led")?.getAttribute("data-lit")).toBe("true");
  });

  it("opens the panel on the keypad for a mode that needs the code, and arms once it's typed", async () => {
    const { container, onArm } = draw("disarmed");
    fireEvent.click(container.querySelector<HTMLButtonElement>('.fd-module .fd-al-bank [aria-label="Arm away"]')!);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByText("Code to arm away")).toBeTruthy();
    for (const d of ["1", "2", "3", "4"]) fireEvent.click(panelKey(d));
    await act(async () => { fireEvent.click(panelKey("Enter code")); await Promise.resolve(); });
    expect(onArm).toHaveBeenCalledWith("away", "1234");
    expect(screen.queryByText("Code to arm away")).toBeNull();
  });

  it("says a wrong code and clears it for another try", async () => {
    const { onDisarm } = draw("away", "standard", { defaultAction: { kind: "disarm" }, onDisarm: vi.fn(() => false) });
    fireEvent.click(panelKey("9"));
    await act(async () => { fireEvent.click(panelKey("Enter code")); await Promise.resolve(); });
    expect(screen.getByText("Wrong code. Try again")).toBeTruthy();
    expect(panelKey("Enter code").getAttribute("aria-disabled")).toBe("true");
    expect(onDisarm).not.toHaveBeenCalled();
  });

  it("arms at once where no code is asked to arm, and disarms a one-mode panel without a code from its key", () => {
    const free = draw("armFree");
    fireEvent.click(free.container.querySelector<HTMLButtonElement>('.fd-module .fd-al-bank [aria-label="Arm night"]')!);
    expect(free.onArm).toHaveBeenCalledWith("night", undefined);

    const one = draw({ ...ALARM_SEEDS.noCode.entity, state: "armed_away" });
    fireEvent.click(one.container.querySelector<HTMLButtonElement>('.fd-module .fd-al-alt .fd-key')!);
    expect(one.onDisarm).toHaveBeenCalledWith(undefined);
  });

  it("asks which mode from a compact row's key, and arms a one-mode panel from it", () => {
    const { container, onArm } = draw("disarmed", "compact");
    const key = container.querySelector<HTMLButtonElement>(".fd-module > .fd-key")!;
    expect(key.getAttribute("aria-label")).toBe("Arm Alarm: choose a mode");
    fireEvent.click(key);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Alarm mode", hidden: true })).toBeTruthy();

    const one = draw("noCode", "compact");
    fireEvent.click(one.container.querySelector<HTMLButtonElement>(".fd-module > .fd-key")!);
    expect(one.onArm).toHaveBeenCalledWith("away", undefined);
  });

  it("counts a delay down in the figure's place, or blanks it with no length to count, with one key that cancels", () => {
    const now = Date.now();
    const timed = draw({ ...ALARM_SEEDS.arming.entity, changedAt: now - 18_000 });
    expect(read(timed.container)).toBe("0:42");
    expect(meta(timed.container)).toBe("Arming awayLeave now");
    expect(timed.keys.map((k) => k.getAttribute("aria-label"))).toEqual(["Cancel arming Alarm"]);

    const untimed = draw("armingUnknown");
    expect(untimed.container.querySelector(".fd-module .fd-read .fd-digits")?.getAttribute("data-pad")).toBe("----");
  });

  it("makes the entry delay urgent, what set it off in an inverted block, and disarms from its key", () => {
    const pending = draw("pending");
    expect(pending.container.querySelector(".fd-module")?.getAttribute("data-level")).toBe("urgent");
    const block = pending.container.querySelector(".fd-module .fd-meta .fd-warn");
    expect(block?.textContent).toBe("Warning: Front door");
    expect(block?.hasAttribute("data-block")).toBe(true);
    expect(meta(pending.container)).toMatch(/Disarm now$/);
    expect(draw("pending", "compact").container.querySelector(".fd-area .fd-warn")?.hasAttribute("data-block")).toBe(true);
  });

  it("makes triggered the alarm: the figure says ALARM, its lines say what set it off and since when, and it is announced", () => {
    const triggered = draw("triggered");
    const module = triggered.container.querySelector(".fd-module");
    expect(module?.getAttribute("data-level")).toBe("alarm");
    expect(module?.querySelector(".fd-read")?.textContent).toBe("ALARM");
    expect(meta(triggered.container)).toBe("Back doorSince 11:51");
    expect(module?.querySelector("[role=alert]")?.textContent).toBe("Alarm: Alarm triggered by Back door.");
    fireEvent.click(triggered.keys[0]);
    expect(screen.getByText("Code to disarm")).toBeTruthy();
  });

  it("gives a triggered row how long ago it went off, which can't be mistaken for the clock", () => {
    const changedAt = Date.now() - 3 * 60_000;
    const { container } = render(<AlarmModule entity={{ ...ALARM_SEEDS.triggered.entity, changedAt }} footprint="compact" onArm={() => true} onDisarm={() => true} />);
    expect(container.querySelector(".fd-read")?.textContent).toBe("Alarm, 3m");
    expect(container.querySelector(".fd-area .fd-warn")?.textContent).toBe("Warning: Back door");
  });

  it("warns of an open door while disarmed, on the screen or in place of a row's area", () => {
    expect(draw("openDoor").container.querySelector(".fd-module .fd-meta .fd-warn")?.textContent).toBe("Warning: 2 open: Back door, Kitchen window");
    expect(draw("openDoor", "compact").container.querySelector(".fd-area .fd-warn")?.textContent).toBe("Warning: 2 open: Back door, Kitchen window");
  });

  it("prints a row's mode in place of its area while armed, and its area while disarmed", () => {
    expect(draw("away", "compact").container.querySelector(".fd-area")?.textContent).toBe("Armed away");
    expect(draw("disarmed", "compact").container.querySelector(".fd-area")?.textContent).toBe("Whole home");
  });

  it("draws a view-only panel as a reading: its glyph and today, nothing to press", () => {
    const { container, keys } = draw("ring", "standard", { onArm: undefined, onDisarm: undefined });
    expect(keys).toEqual([]);
    expect(container.querySelector(".fd-module .fd-glyph")).not.toBeNull();
    expect(container.querySelector(".fd-module .fd-today")).not.toBeNull();
    expect(read(container)).toBe("ON");
  });

  it("blanks the screen while unavailable, says when it was last seen, and lays its key flat with no word", () => {
    const { container, keys } = draw("unavailable");
    expect(container.querySelector(".fd-module .fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(meta(container)).toMatch(/^Unavailable/);
    expect(keys.length).toBe(1);
    expect(keys[0].getAttribute("aria-disabled")).toBe("true");
    expect(keys[0].disabled).toBe(false);
    expect(container.querySelector(".fd-module .fd-key-cap")).toBeNull();
  });

  it("draws every worst-case seed", () => {
    for (const seed of ALARM_WORST_CASE) expect(draw(seed.entity).container.querySelector(".fd-module")).not.toBeNull();
  });
});
