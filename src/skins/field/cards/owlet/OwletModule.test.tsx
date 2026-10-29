import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OwletModule } from "./OwletModule";
import type { OwletModuleProps } from "./OwletModule";
import { OWLET_SEEDS } from "./demo/socks";

/*
 * What every field module does, whatever it is: a reading has no keys, and unavailable blanks the screen. The frame
 * (footprints, details) is ModuleFrame's, tested in shared/ui.test.tsx; test what this sock itself does here.
 */
const draw = (seed: keyof typeof OWLET_SEEDS, footprint?: "compact" | "standard", props: Partial<OwletModuleProps> = {}) => {
  const { container } = render(<OwletModule entity={OWLET_SEEDS[seed].entity} history={OWLET_SEEDS[seed].history} footprint={footprint} {...props} />);
  return {
    container,
    read: container.querySelector(".fd-module .fd-read")?.textContent,
    meta: [...container.querySelectorAll(".fd-module .fd-meta > span")].map((s) => s.textContent),
    line: container.querySelector(".fd-module .fd-area")?.textContent,
  };
};

describe("OwletModule", () => {
  // jsdom has no modal dialog; these do what a browser's do to the `open` attribute.
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  });

  it("is a reading: its sock lies flat where a key would be, and nothing on the module is pressed but its name", () => {
    const { container } = draw("deep");
    expect(container.querySelector(".fd-module .fd-key")).toBeNull();
    expect(container.querySelector(".fd-ow-row > .fd-glyph")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Sleep by hour today. Asleep 9h 54m." })).toBeTruthy();
  });

  it("leads the screen with the heart rate beside a lit heart, then the sleep state and the oxygen", () => {
    const { container, read, meta, line } = draw("deep");
    expect(read).toBe("121bpm");
    expect(meta).toEqual(["Deep sleep", "98% O₂"]);
    expect(line).toBe("Nursery");
    expect(container.querySelector(".fd-pict")?.getAttribute("data-lit")).toBe("true");
  });

  it("beats the heart only while readings are known to arrive", () => {
    const beat = (container: HTMLElement) => container.querySelector(".fd-module .fd-ow-heart")?.hasAttribute("data-beat");
    expect(beat(draw("deep").container)).toBe(true);
    expect(beat(draw("deep", "compact").container)).toBe(true);
    // Stopped: out and still. The host can't tell: lit, but still.
    expect(beat(draw("stale").container)).toBe(false);
    const unknown = draw("deep", "standard", { entity: { ...OWLET_SEEDS.deep.entity, live: undefined } }).container;
    expect(beat(unknown)).toBe(false);
    expect(unknown.querySelector(".fd-pict")?.getAttribute("data-lit")).toBe("true");
    expect(beat(draw("charging").container)).toBe(false);
  });

  it("keeps the readings while the sock hasn't settled on a sleep state", () => {
    const { read, meta } = draw("unknown");
    expect(read).toBe("138bpm");
    expect(meta).toEqual(["Sleep unknown", "98% O₂"]);
  });

  it("dims stopped readings and puts the heart out, saying since when on the area's line", () => {
    const { container, read, line } = draw("stale");
    expect(read).toBe("119bpm");
    expect(container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("stale");
    expect(container.querySelector(".fd-pict")?.getAttribute("data-lit")).toBe("false");
    expect(line).toBe("Warning: No reading since 11:49");
    // A row says it shorter, keeping the time; a day as well as a time keeps the time.
    expect(draw("stale", "compact").line).toBe("Warning: Stopped 11:49");
    expect(draw("long", "compact").line).toBe("Warning: Stopped 18:30");
  });

  it("puts a vitals alert first on the screen, the oxygen beside it, and a row's line names its figure", () => {
    expect(draw("lowOxygen").meta).toEqual(["Warning: Low oxygen", "84% O₂"]);
    expect(draw("lowOxygen", "compact").line).toBe("Warning: Low oxygen 84%");
  });

  it("names the most urgent of several vitals alerts with a count, speaks them all, and keeps the device's problem on the plate", () => {
    const { container, line } = draw("critical");
    const first = container.querySelector(".fd-module .fd-meta > span");
    expect(first?.querySelector(".fd-ow-warn-l")?.textContent).toBe("Critical oxygen +1");
    expect(first?.querySelector(".fd-sr:last-child")?.textContent).toBe("Critical oxygen, Low heart rate");
    expect(line).toBe("Warning: Battery low");
    // A row has no meta lines: the count first, so a long line never hides it.
    expect(draw("critical", "compact").line).toBe("Warning: 2 alerts: Critical oxygen 79%, Low heart rate");
  });

  it("says a switched-off base station in plain words in place of the area, behind any warning", () => {
    expect(draw("baseOff").line).toBe("Base station off");
    expect(draw("lowBattery", "standard", { entity: { ...OWLET_SEEDS.lowBattery.entity, baseOn: false } }).line).toBe("Warning: Battery low");
  });

  it("says the sleep state on a row's line, and Charging rather than the area while it charges", () => {
    expect(draw("light", "compact").line).toBe("Light sleep");
    expect(draw("charging", "compact").line).toBe("Charging");
    expect(draw("unavailable", "compact").line).toBe("Nursery");
  });

  it("blanks the screen while it reports nothing, and says why and when it was last seen", () => {
    const { container, meta } = draw("charging");
    expect(container.querySelector(".fd-module .fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(meta).toEqual(["Charging", "Seen 07:12"]);
    expect(draw("unavailable").meta).toEqual(["Unavailable", "Seen 10:42"]);
    expect(container.querySelector(".fd-glyph")?.hasAttribute("data-unavailable")).toBe(true);
    // A sock off its foot: the base's alert takes the plate, the screen says it reports nothing.
    expect(draw("sockOff").line).toBe("Warning: Sock off");
  });

  it("lists every alert in the panel, keeps the sleep state on its screen, and switches the base station only there", () => {
    const onBaseToggle = vi.fn();
    render(<OwletModule entity={{ ...OWLET_SEEDS.critical.entity, baseOn: true }} history={OWLET_SEEDS.critical.history} onBaseToggle={onBaseToggle} defaultOpen />);
    const panel = screen.getByRole("dialog", { name: "Nova details" });
    expect([...panel.querySelectorAll(".fd-ow-say li")].map((li) => li.textContent)).toEqual(["Warning: Critical oxygen", "Warning: Low heart rate", "Warning: Battery low"]);
    expect([...panel.querySelectorAll(".fd-meta > span")].map((s) => s.textContent)).toEqual(["Light sleep", "79% O₂"]);
    const base = screen.getByRole("button", { name: "Base station" });
    expect(base.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(base);
    expect(onBaseToggle).toHaveBeenCalledTimes(1);
    expect(panel.textContent).toContain("Low 72 bpm · High 150 bpm");
    expect(panel.textContent).toContain("Live · updated 11:54");
  });

  it("hides the base station's key when its switch can't be read or switched", () => {
    render(<OwletModule entity={OWLET_SEEDS.deep.entity} onBaseToggle={() => {}} defaultOpen />);
    expect(screen.queryByRole("button", { name: "Base station" })).toBeNull();
  });
});
