import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OwletModule } from "./OwletModule";
import type { OwletModuleProps } from "./OwletModule";
import { OWLET_SEEDS } from "@dashhaus/core/seeds/owlet";
import { onHourCycle } from "@dashhaus/core/seeds/clock";

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

  it("makes stopped readings urgent: the heart goes out, the figure dims, and an inverted block says since when", () => {
    const { container, read, meta, line } = draw("stale");
    expect(read).toBe("119bpm");
    expect(container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("stale");
    expect(container.querySelector(".fd-module")?.getAttribute("data-level")).toBe("urgent");
    expect(container.querySelector(".fd-pict")?.getAttribute("data-lit")).toBe("false");
    expect(meta).toEqual(["Warning: Stopped 11:49", "Deep sleep"]);
    expect(container.querySelector(".fd-meta .fd-warn")?.hasAttribute("data-block")).toBe(true);
    expect(line).toBe("Nursery");
    // A row's line takes the block; a day as well as a time keeps the time.
    expect(draw("stale", "compact").line).toBe("Warning: Stopped 11:49");
    expect(draw("long", "compact").line).toBe("Warning: Stopped 18:30");
    // The time is its own part, so a narrow module or row lets it go (OwletModule.css) and keeps the word whole.
    expect(container.querySelector(".fd-meta .fd-warn .fd-ow-since")?.textContent).toBe(" 11:49");
    expect(draw("long", "compact").container.querySelector(".fd-area .fd-ow-since")?.textContent).toBe(" 18:30");
  });

  it("leads stopped readings with the word on a 12-hour clock too, the time after it", () => {
    const at12 = (seed: keyof typeof OWLET_SEEDS, footprint?: "compact" | "standard") => {
      const { entity, history } = onHourCycle(OWLET_SEEDS[seed], "h12");
      return render(<OwletModule entity={entity} history={history} footprint={footprint} />).container;
    };
    expect(at12("stale").querySelector(".fd-meta .fd-warn")?.textContent).toBe("Warning: Stopped 11:49\u00a0AM");
    expect(at12("long", "compact").querySelector(".fd-area")?.textContent).toBe("Warning: Stopped 6:30\u00a0PM");
  });

  it("makes a vitals alert the alarm: the vital that set it off is the figure, its first line says how in a word", () => {
    const { container, read, meta, line } = draw("lowOxygen");
    expect(container.querySelector(".fd-module")?.getAttribute("data-level")).toBe("alarm");
    expect(read).toBe("84% O₂");
    expect(meta).toEqual(["Low", "131 bpm"]);
    expect(line).toBe("Nursery");
    expect(container.querySelector("[role=alert]")?.textContent).toBe("Alarm: Nova, low oxygen, oxygen 84 percent.");
    // A row's line names it in full, in an inverted block; its screen keeps the vital's figure.
    const row = draw("lowOxygen", "compact");
    expect(row.line).toBe("Warning: Low oxygen");
    expect(row.container.querySelector(".fd-area .fd-warn")?.hasAttribute("data-block")).toBe(true);
    expect(row.read).toBe("84% O₂");
  });

  it("names the next vitals alert on the second line, and lets the advisory battery step aside", () => {
    const { read, meta, line } = draw("critical");
    expect(read).toBe("79% O₂");
    // spec/cards.md → a warning's words fit a row (13 characters, `ALERT_WORD`); the details' list says each in full.
    expect(meta).toEqual(["Critical", "Low pulse"]);
    // The battery is advisory: the alarm takes its place, and the panel still lists it.
    expect(line).toBe("Nursery");
    expect(draw("critical", "compact").line).toBe("Warning: Critical O₂ +1");
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

  it("names its charger in the dim ink, blanks the screen out of reach, and says why and when it was last seen", () => {
    const { container, meta } = draw("charging");
    // spec/field.md → a known resting state is never blank, but its figure in the dim ink.
    expect(container.querySelector(".fd-module .fd-read")?.textContent).toBe("DOCKCharging");
    expect(container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("charging");
    // spec/cards.md → Field's meta line still says the core word: `lastSeenFact`'s "Last seen".
    expect(meta).toEqual(["Charging", "Last seen 07:12"]);
    const away = draw("unavailable");
    expect(away.container.querySelector(".fd-module .fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(away.meta).toEqual(["Unavailable", "Last seen 10:42"]);
    expect(container.querySelector(".fd-glyph")?.hasAttribute("data-unavailable")).toBe(true);
    // Today's legend says why it stopped, not a sleep total that stopped counting; the meter keeps the sleep so far.
    expect(screen.getByRole("img", { name: "Sleep by hour today. Charging." })).toBeTruthy();
    // A sock off its foot stops the monitoring: urgent, its block on the screen, when it was last seen beside it.
    expect(draw("sockOff").meta).toEqual(["Warning: Sock off", "Last seen 11:41"]);
  });

  it("leaves a low battery advisory, on the plate's line with its marker", () => {
    const { container, line } = draw("lowBattery");
    expect(line).toBe("Warning: Battery low");
    expect(container.querySelector(".fd-module")?.hasAttribute("data-level")).toBe(false);
    expect(container.querySelector(".fd-area .fd-warn")?.hasAttribute("data-block")).toBe(false);
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
