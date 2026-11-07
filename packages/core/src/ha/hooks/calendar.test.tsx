import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useHaCalendar } from "./calendar";
import { HaProvider } from "../provider";
import { createHaStore } from "../store";
import { createDemoCalendarHaTransport } from "../../demo/calendar";
import type { HaTransport } from "../types";

function setup(transport: HaTransport = createDemoCalendarHaTransport()) {
  const store = createHaStore(transport);
  const wrapper = ({ children }: { children: ReactNode }) => <HaProvider store={store}>{children}</HaProvider>;
  return { wrapper };
}

describe("useHaCalendar", () => {
  it("reads every calendar's events with calendar.get_events, merged and named by calendar", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useHaCalendar("calendar.family", { calendarEntityIds: ["calendar.school"], days: 7 }), { wrapper });
    await waitFor(() => expect(result.current.entity.events?.length).toBe(8));
    expect(result.current.entity).toMatchObject({ name: "Family", state: "ok", days: 7, calendars: 2 });
    expect(result.current.entity.events?.find((e) => e.title === "Assembly")?.calendar).toBe("School");
    expect(result.current.entity.events?.find((e) => e.title === "Dentist")?.calendar).toBe("Family");
    // Today's plan comes from the events: the school run, the dentist and swimming.
    expect(result.current.history.busyMinutes).toBe(30 + 60 + 60);
  });

  it("reads one calendar's events unnamed, and only to its horizon", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useHaCalendar("calendar.family", { days: 1 }), { wrapper });
    await waitFor(() => expect(result.current.entity.events?.map((e) => e.title)).toEqual(["Bin day", "School run", "Dentist", "Swimming"]));
    expect(result.current.entity.events?.every((e) => e.calendar === undefined)).toBe(true);
  });

  it("asks nothing when the host supplies the events, and reports a failed read", async () => {
    const transport = createDemoCalendarHaTransport();
    const call = vi.spyOn(transport, "callService");
    const { wrapper } = setup(transport);
    const { result } = renderHook(() => useHaCalendar("calendar.family", { events: [] }), { wrapper });
    await waitFor(() => expect(result.current.entity.state).toBe("ok"));
    expect(result.current.entity.events).toEqual([]);
    expect(call).not.toHaveBeenCalled();

    const failing = createDemoCalendarHaTransport();
    vi.spyOn(failing, "callService").mockRejectedValue(new Error("No calendar"));
    const onEventsError = vi.fn();
    const { wrapper: failingWrapper } = setup(failing);
    renderHook(() => useHaCalendar("calendar.family", { onEventsError }), { wrapper: failingWrapper });
    await waitFor(() => expect(onEventsError).toHaveBeenCalled());
  });
});
