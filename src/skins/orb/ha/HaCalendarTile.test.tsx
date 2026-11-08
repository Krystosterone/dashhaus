import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaCalendarTile } from "./HaCalendarTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "calendar.family": {
    entity_id: "calendar.family",
    state: "off",
    attributes: { friendly_name: "Family" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

/** An hour from now, as Home Assistant answers it: the countdown is the card's, from its minute clock. */
const soon = () => {
  const start = new Date(Date.now() + 61 * 60_000);
  return { start: start.toISOString(), end: new Date(start.getTime() + 3_600_000).toISOString(), summary: "Dentist" };
};

describe("HaCalendarTile", () => {
  it("reads the calendar's events with calendar.get_events and leads with the next", async () => {
    const event = soon();
    const { callService } = renderConnected(<HaCalendarTile entityId="calendar.family" />, raw);
    callService.mockResolvedValue({ response: { "calendar.family": { events: [event] } } });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Family" })).toBeTruthy());
    await waitFor(() => expect(callService).toHaveBeenCalledWith(
      "calendar",
      "get_events",
      expect.objectContaining({ start_date_time: expect.any(String), end_date_time: expect.any(String) }),
      { target: { entity_id: "calendar.family" }, returnResponse: true },
    ));
    // An event past midnight is tomorrow's, on the locale's clock (no hour_cycle: `00:05`, or `12:05 AM`); one still
    // today counts down.
    await waitFor(() => expect(screen.getByRole("button", { name: /^Family: Dentist, (In 1h 1m|Tomorrow (\d\d:\d\d|\d{1,2}:\d\d\s[AP]M))\. Open details$/ })).toBeTruthy());
  });

  it("shows a missing calendar as unavailable", async () => {
    renderConnected(<HaCalendarTile entityId="calendar.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });

  it("asks nothing when the host supplies the events", async () => {
    const { callService } = renderConnected(<HaCalendarTile entityId="calendar.family" events={[]} />, raw);
    await waitFor(() => expect(screen.getByRole("button", { name: "Family: Free for 7 days. Open details" })).toBeTruthy());
    expect(callService).not.toHaveBeenCalled();
  });
});
