import { describe, expect, it } from "vitest";
import { createDemoCalendarHaTransport } from "./calendar";
import { calendarEventsFromHass } from "../ha/mappers/calendar";
import type { HassEntities } from "../ha/types";

const today = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};
const DAY = 86_400_000;

describe("createDemoCalendarHaTransport", () => {
  it("publishes the family's and the school's calendars", async () => {
    const transport = createDemoCalendarHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(latest).toMatchObject({ "calendar.family": { attributes: { friendly_name: "Family" } }, "calendar.school": { state: "off" } });
  });

  it("answers the events query for the calendar it targets, within the range asked", async () => {
    const transport = createDemoCalendarHaTransport();
    const ask = (entity_id: string, days: number) => transport.callService("calendar", "get_events", {
      start_date_time: new Date(today()).toISOString(),
      end_date_time: new Date(today() + days * DAY).toISOString(),
    }, { target: { entity_id }, returnResponse: true });
    const family = calendarEventsFromHass(await ask("calendar.family", 1), [{ entityId: "calendar.family" }]);
    expect(family.map((e) => e.title)).toEqual(["Bin day", "School run", "Dentist", "Swimming"]);
    expect(family[0]).toMatchObject({ allDay: true, start: today() });
    const week = calendarEventsFromHass(await ask("calendar.family", 7), [{ entityId: "calendar.family" }]);
    expect(week).toHaveLength(6);
    const school = calendarEventsFromHass(await ask("calendar.school", 7), [{ entityId: "calendar.school" }]);
    expect(school.map((e) => e.title)).toEqual(["Assembly", "Inset day"]);
  });

  it("refuses every other service: a calendar here is read-only", async () => {
    await expect(createDemoCalendarHaTransport().callService("calendar", "create_event", { entity_id: "calendar.family" })).rejects.toThrow(/read-only/);
  });
});
