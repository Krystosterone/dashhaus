import { render as renderPlain, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import type { HourCycle } from "@dashhaus/core/entities/clock";
import { describe, expect, it } from "vitest";
import { CalendarModule } from "./CalendarModule";
import { CALENDAR_SEEDS } from "@dashhaus/core/seeds/calendar";

/** A card on a dashboard of this hour cycle; `render` puts it on 24 hours, the clock the seeds are written on. */
const renderOn = (hourCycle: HourCycle, ui: ReactElement) => renderPlain(ui, { wrapper: ({ children }: { children: ReactNode }) => <HourCycleProvider hourCycle={hourCycle}>{children}</HourCycleProvider> });
const render = (ui: ReactElement) => renderOn("h23", ui);

/*
 * What every field module does, whatever it is: a reading has no keys, a lit pictogram says on, and unavailable
 * blanks the screen (spec/field.md → Unavailable). The frame (footprints, details) is ModuleFrame's, tested in
 * shared/ui.test.tsx; this tests what the calendar itself does.
 */
const draw = (seed: keyof typeof CALENDAR_SEEDS, footprint?: "compact" | "standard") =>
  render(<CalendarModule entity={CALENDAR_SEEDS[seed].entity} history={CALENDAR_SEEDS[seed].history} footprint={footprint} />).container;

describe("CalendarModule", () => {
  it("is a reading: no keys, its glyph on a flat plate", () => {
    const container = draw("normal");
    expect(container.querySelector(".fd-module .fd-key")).toBeNull();
    expect(container.querySelector(".fd-module .fd-glyph")).not.toBeNull();
  });

  it("leads with the clock the next event starts at, its title and how long until it on the meta lines", () => {
    const container = draw("normal");
    expect(container.querySelector(".fd-read-fig")?.textContent).toBe("14:00Dentist, In 2h 6m");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("DentistIn 2h 6m");
    expect(container.querySelector(".fd-pict")?.getAttribute("data-lit")).toBe("false");
  });

  it("says NOW, lit, while an event is under way, and an all-day event to come by its weekday", () => {
    const under = draw("underWay");
    expect(under.querySelector(".fd-read-fig")?.textContent).toBe("NOWTeam standup, Until 12:15");
    expect(under.querySelector(".fd-pict")?.getAttribute("data-lit")).toBe("true");
    expect(draw("allDay").querySelector(".fd-read-fig")?.textContent).toBe("NOWBin day, All day");
    const birthday = { ...CALENDAR_SEEDS.normal.entity, events: [{ title: "Birthday", start: new Date(2026, 9, 22).getTime(), end: new Date(2026, 9, 23).getTime(), allDay: true }] };
    expect(render(<CalendarModule entity={birthday} />).container.querySelector(".fd-read-fig")?.textContent).toBe("THUBirthday, Thu");
  });

  it("says FREE in the dim ink with nothing to the horizon, and waits on blank segments", () => {
    const free = draw("free");
    expect(free.querySelector(".fd-read-fig")?.textContent).toBe("FREEFree for 7 days");
    expect(free.querySelector(".fd-module")?.getAttribute("data-state")).toBe("off");
    const waiting = draw("waiting");
    expect(waiting.querySelector(".fd-digits")?.textContent).toBe("No reading yet");
    expect(waiting.querySelector(".fd-meta")?.textContent).toBe("No reading yet");
  });

  it("names the event on a row's line, then its day when it isn't today's, and with none what's left today", () => {
    expect(draw("normal", "compact").querySelector(".fd-area")?.textContent).toBe("Dentist");
    expect(draw("tomorrow", "compact").querySelector(".fd-area")?.textContent).toBe("School trip · Tomorrow");
    expect(draw("free", "compact").querySelector(".fd-area")?.textContent).toBe("Nothing today");
  });

  it("blanks the screen while unavailable and says when it was last seen", () => {
    const container = draw("unavailable");
    expect(container.querySelector(".fd-digits")?.textContent).toBe("Unavailable");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("UnavailableLast seen 08:20");
  });

  it("lists today's events and what's coming in the panel, with today's hours busy", () => {
    render(<CalendarModule entity={CALENDAR_SEEDS.normal.entity} history={CALENDAR_SEEDS.normal.history} defaultOpen />);
    const lists = screen.getAllByRole("list");
    expect(lists[0].textContent).toContain("14:00–15:00DentistMain St Dental");
    expect(lists[1].textContent).toContain("Tomorrow 18:00Parents' evening");
    expect(screen.getAllByText("Busy 2h 30m").length).toBeGreaterThan(0);
    // The plan's hours after this one are known ahead, on the row's meter and the panel's.
    const { currentHour } = CALENDAR_SEEDS.normal.history;
    for (const meter of document.querySelectorAll(".fd-meter")) {
      const hours = [...meter.querySelectorAll(".fd-meter-h")];
      expect(hours[currentHour].hasAttribute("data-ahead")).toBe(false);
      expect(hours[currentHour + 1].hasAttribute("data-ahead")).toBe(true);
    }
    expect(screen.getByText("Next 7 days")).toBeTruthy();
  });

  describe("on a 12-hour clock", () => {
    const draw12 = (seed: keyof typeof CALENDAR_SEEDS, footprint?: "compact" | "standard") =>
      renderOn("h12", <CalendarModule entity={CALENDAR_SEEDS[seed].entity} history={CALENDAR_SEEDS[seed].history} footprint={footprint} />).container;

    it("draws 2:00 in four places, the first unlit, and a screen reader hears the time with its period", () => {
      const figure = draw12("normal").querySelector(".fd-read-fig .fd-digits");
      expect(figure?.textContent).toBe("2:00");
      expect(figure?.getAttribute("data-pad")).toBe("0");
      const tomorrow = draw12("tomorrow");
      expect(tomorrow.querySelector(".fd-read-fig .fd-digits")?.textContent).toBe("9:30");
      expect(tomorrow.querySelector(".fd-read-fig .fd-sr")?.textContent).toBe("School trip, Tomorrow 9:30\u00a0AM");
    });

    it("says another day's period on the meta line in core's words, and today's countdown as on 24 hours", () => {
      expect(draw12("tomorrow").querySelector(".fd-meta")?.textContent).toBe("School tripTomorrow 9:30\u00a0AM");
      expect(draw12("normal").querySelector(".fd-meta")?.textContent).toBe("DentistIn 2h 6m");
      expect(draw12("underWay").querySelector(".fd-meta")?.textContent).toBe("Team standupUntil 12:15\u00a0PM");
    });

    it("says when first on a row's line, so a clip cuts the title and the period stays in sight", () => {
      expect(draw12("tomorrow", "compact").querySelector(".fd-area")?.textContent).toBe("Tomorrow 9:30\u00a0AM · School trip");
      expect(draw12("normal", "compact").querySelector(".fd-area")?.textContent).toBe("In 2h 6m · Dentist");
      // Under way, the screen's NOW says when, and the line names the event alone, as on 24 hours.
      expect(draw12("underWay", "compact").querySelector(".fd-area")?.textContent).toBe("Team standup");
    });

    it("spans the panel's events with their periods", () => {
      renderOn("h12", <CalendarModule entity={CALENDAR_SEEDS.normal.entity} history={CALENDAR_SEEDS.normal.history} defaultOpen />);
      const lists = screen.getAllByRole("list");
      expect(lists[0].textContent).toContain("2:00–3:00\u00a0PMDentist");
      expect(lists[1].textContent).toContain("Tomorrow 6:00\u00a0PMParents' evening");
    });
  });
});
