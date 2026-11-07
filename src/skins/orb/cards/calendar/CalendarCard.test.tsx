import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarCard } from "./CalendarCard";
import { CALENDAR_SEEDS } from "@dashhaus/core/seeds/calendar";

const { normal, underWay, allDay, tomorrow, free, waiting, unavailable, manyAllDay } = CALENDAR_SEEDS;

describe("CalendarCard", () => {
  it("is a reading: no glow, a bare icon, its class prefix", () => {
    const { container } = render(<CalendarCard entity={normal.entity} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd ca");
    expect(container.querySelector(".hd-orb--static")).not.toBeNull();
  });

  it("leads with the next event and how long until it, and counts what's left today", () => {
    const onOpenDetails = vi.fn();
    const { container } = render(<CalendarCard entity={normal.entity} onOpenDetails={onOpenDetails} />);
    screen.getByRole("button", { name: "Family: Dentist, In 2h 6m. Open details" }).click();
    expect(onOpenDetails).toHaveBeenCalled();
    expect(container.querySelector(".hd-area")?.textContent).toBe("2 left today");
    expect(container.querySelector(".ca-when")?.textContent).toBe("In2h 6m");
  });

  it("says until when an event under way runs, an all-day event, and another day's", () => {
    const { rerender } = render(<CalendarCard entity={underWay.entity} />);
    expect(screen.getByRole("img", { name: "Team standup, Until 12:15" })).toBeTruthy();
    rerender(<CalendarCard entity={allDay.entity} />);
    expect(screen.getByRole("img", { name: "Bin day, All day" })).toBeTruthy();
    rerender(<CalendarCard entity={tomorrow.entity} />);
    expect(screen.getByRole("img", { name: "School trip, Tomorrow 09:30" })).toBeTruthy();
    rerender(<CalendarCard entity={manyAllDay.entity} />);
    expect(screen.getByRole("img", { name: "Half term, Until Fri" })).toBeTruthy();
  });

  it("is Free, and for how long, with nothing to the horizon; waits in words before its events are read", () => {
    const { container, rerender } = render(<CalendarCard entity={free.entity} />);
    expect(screen.getByRole("img", { name: "Free for 7 days" })).toBeTruthy();
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe("off");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Nothing today");
    rerender(<CalendarCard entity={waiting.entity} />);
    expect(screen.getByRole("img", { name: "Waiting for events" })).toBeTruthy();
  });

  it("names the event in a compact row and cues when, Now while under way", () => {
    const { container, rerender } = render(<CalendarCard entity={underWay.entity} footprint="compact" />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Team standup");
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Team standup · Now");
    rerender(<CalendarCard entity={normal.entity} footprint="compact" showControl={false} />);
    expect(container.querySelector(".hd-val")?.textContent).toBe("In 2h 6m");
  });

  it("hides the events while unavailable", () => {
    const { container } = render(<CalendarCard entity={unavailable.entity} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Unavailable");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Unavailable");
  });

  it("lists today's events in the sheet, what's coming, and today's plan", () => {
    render(<CalendarCard entity={normal.entity} history={normal.history} variant="sheet" />);
    const lists = screen.getAllByRole("list");
    expect(lists[0].textContent).toContain("08:15–08:45School run");
    expect(lists[0].textContent).toContain("14:00–15:00DentistMain St Dental");
    expect(lists[1].textContent).toContain("Tomorrow 18:00Parents' evening");
    expect(screen.getByText("Busy 2h 30m")).toBeTruthy();
    expect(screen.getByText("Next 7 days")).toBeTruthy();
  });
});
