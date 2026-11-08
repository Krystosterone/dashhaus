import { render as renderPlain } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import type { HourCycle } from "@dashhaus/core/entities/clock";
import { describe, expect, it } from "vitest";
import { SunModule } from "./SunModule";
import { SUN_SEEDS } from "@dashhaus/core/seeds/sun";
import type { SunEntity } from "@dashhaus/core/entities/sun/types";

/*
 * What every field module does, whatever it is: a reading has no keys, so nothing on it is pressed but its name, and
 * unavailable blanks the screen (spec/field.md → Unavailable). The frame (footprints, details) is ModuleFrame's,
 * tested in shared/ui.test.tsx; test what the sun itself does here.
 */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const entity: SunEntity = {
  entityId: "sun.sun", name: "Sun", state: "ok", up: true, now: at(19, 15, 55),
  nextSetting: at(19, 20, 30), nextDusk: at(19, 21, 4), nextDawn: at(20, 4, 25), nextRising: at(20, 5, 1), nextNoon: at(20, 12, 46),
  elevation: 46.2, azimuth: 250, lastUpdated: "15:51",
};
/** A module on a dashboard of this hour cycle; `render` puts it on 24 hours, the clock the seeds are written on. */
const renderOn = (hourCycle: HourCycle, ui: ReactElement) => renderPlain(ui, { wrapper: ({ children }: { children: ReactNode }) => <HourCycleProvider hourCycle={hourCycle}>{children}</HourCycleProvider> });
const render = (ui: ReactElement) => renderOn("h23", ui);
const draw = (e: SunEntity, footprint?: "compact" | "standard") => render(<SunModule entity={e} footprint={footprint} />).container;

describe("SunModule", () => {
  it("is a reading: no keys, a glyph on its plate", () => {
    const container = draw(entity);
    expect(container.querySelectorAll(".fd-key")).toHaveLength(0);
    expect(container.querySelector(".fd-glyph")).not.toBeNull();
  });

  it("is a clock of what comes next, lit while the sun is up, and names it and counts down to it", () => {
    const container = draw(entity);
    expect(container.querySelector(".fd-read-fig [aria-hidden]")?.textContent).toBe("20:30");
    expect(container.querySelector(".fd-sr")?.textContent).toBe("Sunset at 20:30, sets in 4h 35m");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("SunsetIn 4h 35m");
    expect(container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("on");
    expect(container.querySelector(".fd-screen .fd-pict")?.getAttribute("data-lit")).toBe("true");
  });

  it("leads with the sunrise while the sun is down, its pictogram unlit", () => {
    const container = draw({ ...entity, up: false, now: at(19, 20, 49), nextSetting: at(20, 20, 28) });
    expect(container.querySelector(".fd-read-fig [aria-hidden]")?.textContent).toBe("05:01");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("SunriseIn 8h 12m");
    expect(container.querySelector(".fd-screen .fd-pict")?.getAttribute("data-lit")).toBe("false");
  });

  it("counts down on a row's line, which has no meta lines", () => {
    expect(draw(entity, "compact").textContent).toContain("Sets in 4h 35m");
  });

  it("says UP where no sunset is reported, and the words on its meta line", () => {
    const container = draw({ ...entity, nextSetting: undefined });
    expect(container.querySelector(".fd-read-fig [aria-hidden]")?.textContent).toBe("UP");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Up all day");
  });

  it("blanks the screen before its first report, and while unavailable says when it was last seen", () => {
    expect(draw({ entityId: "sun.sun", name: "Sun", state: "ok", now: entity.now }).querySelector(".fd-meta")?.textContent).toBe("No reading yet");
    const container = draw({ entityId: "sun.sun", name: "Sun", state: "unavailable", now: entity.now, lastSeen: "08:20" });
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("UnavailableLast seen 08:20");
  });

  it("draws the sun's height by hour on today's meter, the hours ahead dim, and the day's daylight", () => {
    const seed = SUN_SEEDS.normal;
    const { container } = render(<SunModule entity={seed.entity} history={seed.history} />);
    expect(container.querySelector(".fd-today .fd-legend-v")?.textContent).toMatch(/^Daylight 10h 4\dm$/);
    expect(container.querySelectorAll(".fd-meter-h[data-ahead]").length).toBe(12);
  });

  it("leads a compact row with its glyph", () => {
    expect(draw(entity, "compact").querySelector(".fd-module > .fd-glyph")).not.toBeNull();
  });

  describe("on a 12-hour clock", () => {
    const draw12 = (e: SunEntity, footprint?: "compact" | "standard") => renderOn("h12", <SunModule entity={e} footprint={footprint} />).container;
    // Down on the 19th with its sunrise more than a day off, on the 21st: its day, and its time with its period.
    const far: SunEntity = { ...entity, up: false, nextRising: at(21, 9, 30) };

    it("draws 8:30 in four places, the first unlit, and a screen reader hears the time with its period", () => {
      const figure = draw12(entity).querySelector(".fd-read-fig .fd-digits");
      expect(figure?.textContent).toBe("8:30");
      expect(figure?.getAttribute("data-pad")).toBe("0");
      expect(draw12(entity).querySelector(".fd-read-fig .fd-sr")?.textContent).toBe("Sunset at 8:30\u00a0PM, sets in 4h 35m");
    });

    it("counts down on the meta line as on 24 hours, and says a far day's time whole with its period", () => {
      expect(draw12(entity).querySelector(".fd-meta")?.textContent).toBe("SunsetIn 4h 35m");
      expect(draw12(far).querySelector(".fd-meta")?.textContent).toBe("SunriseWed 9:30\u00a0AM");
      expect(draw(far).querySelector(".fd-meta")?.textContent).toBe("SunriseWed");
    });

    it("says a far day's time whole on a row's line, and the countdown otherwise", () => {
      expect(draw12(entity, "compact").textContent).toContain("Sets in 4h 35m");
      expect(draw12(far, "compact").querySelector(".fd-area")?.textContent).toBe("Rises Wed 9:30\u00a0AM");
    });

    it("lists every time to come in the panel with its period", () => {
      renderOn("h12", <SunModule entity={entity} defaultOpen />);
      expect([...document.querySelectorAll(".fd-su-ev")].map((li) => li.textContent)).toEqual([
        "Sunset8:30\u00a0PM", "Dusk9:04\u00a0PM", "DawnTomorrow 4:25\u00a0AM", "SunriseTomorrow 5:01\u00a0AM", "NoonTomorrow 12:46\u00a0PM",
      ]);
    });
  });
});
