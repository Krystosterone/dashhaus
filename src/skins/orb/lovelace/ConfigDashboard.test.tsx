import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import { parseDashboardConfig } from "./config";
import { ConfigDashboard } from "./ConfigDashboard";

const light = (id: string, name: string) => ({ entity_id: id, state: "on", attributes: { friendly_name: name, supported_color_modes: ["onoff"] } });
const raw: HassEntities = { "light.a": light("light.a", "Desk"), "light.b": light("light.b", "Pendant") };

function draw(yaml: Record<string, unknown>, entities: HassEntities = raw) {
  const config = parseDashboardConfig(yaml);
  return renderConnected(
    <ConfigDashboard config={{ ...config, rows: config.rows ?? [] }} panels={{ "baby-view": { url_path: "baby-view", title: "Baby View" } }} now={new Date(2026, 9, 17, 11, 54)} />,
    entities,
  );
}

const nav = () => screen.queryByRole("navigation", { name: "Dashboard" });
const rows = [{ title: "Quick actions", cards: ["light.a"] }, { title: "Home status", cards: ["light.b"] }];

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => history.replaceState(null, "", "/"));

describe("ConfigDashboard nav", () => {
  it("lists the titled rows by default, and jumps to one", async () => {
    draw({ rows });
    const bar = nav()!;
    expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual(["Quick actions", "Home status"]);

    fireEvent.click(within(bar).getByRole("button", { name: "Home status" }));
    expect(document.querySelector("[data-section-id=section-home-status]")!.scrollIntoView).toHaveBeenCalled();
    expect(within(bar).getByRole("button", { name: "Home status" }).getAttribute("aria-current")).toBe("location");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
  });

  it("sends each of two same-titled rows' pills to its own row", async () => {
    draw({ rows: [{ title: "Nursery", cards: ["light.a"] }, { title: "Status", cards: ["light.b"] }, { title: "Nursery", cards: ["light.b"] }] });
    const pills = within(nav()!).getAllByRole("button", { name: "Nursery" });
    expect(pills).toHaveLength(2);
    fireEvent.click(pills[1]);
    // One mock on the prototype: which element it scrolled is the call's `this`.
    const scrolled = vi.mocked(Element.prototype.scrollIntoView).mock.contexts;
    expect(scrolled).toEqual([document.querySelector("[data-section-id=section-nursery-2]")]);
    expect(pills[1].getAttribute("aria-current")).toBe("location");
    expect(pills[0].hasAttribute("aria-current")).toBe(false);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
  });

  it("opens the card's own pages, keeps them in the URL, and follows back", async () => {
    draw({ title: "Home", rows, pages: [{ id: "living", title: "Living room", rows: [{ title: "Lights", cards: ["light.b"] }] }] });
    const bar = nav()!;
    expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual(["Home", "Living room"]);

    fireEvent.click(within(bar).getByRole("button", { name: "Living room" }));
    expect(screen.getByRole("heading", { level: 1, name: "Living room" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Lights" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Quick actions" })).toBeNull();
    expect(location.hash).toBe("#page=living");
    expect(within(bar).getByRole("button", { name: "Living room" }).getAttribute("aria-current")).toBe("page");

    act(() => {
      history.replaceState(null, "", "/");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Quick actions" })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
  });

  it("returns to the main page for a row picked from another page", async () => {
    history.replaceState(null, "", "/#page=living");
    draw({ rows, pages: [{ id: "living", title: "Living room", rows: [{ title: "Lights", cards: ["light.b"] }] }], nav: [{ page: "living" }, { section: "Home status" }] });
    fireEvent.click(within(nav()!).getByRole("button", { name: "Home status" }));
    expect(location.hash).toBe("");
    await waitFor(() => expect(document.querySelector("[data-section-id=section-home-status]")?.scrollIntoView).toHaveBeenCalled());
  });

  it("leaves for another dashboard through Home Assistant's router, named from its panels", () => {
    draw({ rows, nav: [{ section: "Quick actions" }, { navigate: "/baby-view/0" }] });
    const heard = vi.fn();
    addEventListener("location-changed", heard);
    const leave = within(nav()!).getByRole("button", { name: "Baby View, another dashboard" });
    fireEvent.click(leave);
    removeEventListener("location-changed", heard);
    expect(location.pathname).toBe("/baby-view/0");
    expect(heard).toHaveBeenCalledOnce();
  });

  it("has no nav when told so, on a wall panel by default, or with one place to go", async () => {
    const cases = [{ rows, nav: false }, { rows, viewing: "far" }, { rows: [rows[0]] }];
    for (const yaml of cases) {
      const view = draw(yaml);
      expect(nav()).toBeNull();
      await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
      view.unmount();
    }
    draw({ rows, viewing: "far", nav: [{ section: "Quick actions" }, { section: "Home status" }] });
    expect(nav()).not.toBeNull();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
  });
});

describe("ConfigDashboard layout", () => {
  const cellOf = (name: string) => screen.getByRole("heading", { name }).closest(".dash-place") as HTMLElement;

  it("places each card on the row's unit grid where the YAML puts it, in YAML order", async () => {
    draw({ rows: [{ title: "Glance", columns: 3, align: "bottom", cards: [
      { entity: "light.a", column: 1, width: 2, footprint: "featured" },
      { entity: "light.b", column: 3 },
    ] }] });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
    const grid = document.querySelector(".dash-row") as HTMLElement;
    expect(grid.dataset.tracks).toBe("3");
    expect(grid.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    // The featured hero is four units; the standard card beside it two, moved down to the row's bottom.
    expect([cellOf("Desk").style.gridColumn, cellOf("Desk").style.gridRow]).toEqual(["1 / span 2", "1 / span 4"]);
    expect([cellOf("Pendant").style.gridColumn, cellOf("Pendant").style.gridRow]).toEqual(["3 / span 1", "3 / span 2"]);
    expect([...grid.children].map((cell) => cell.querySelector("h3")?.textContent)).toEqual(["Desk", "Pendant"]);
  });

  it("draws plain cards as one untitled grid, with no heading", async () => {
    draw({ cards: ["light.a", "light.b"] });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
    expect(document.querySelectorAll(".dash-row")).toHaveLength(1);
    expect(document.querySelector(".dash-sec")).toBeNull();
    expect(nav()).toBeNull();
  });
});

describe("ConfigDashboard quiet", () => {
  const speaker: HassEntities = {
    "media_player.kitchen": {
      entity_id: "media_player.kitchen", state: "playing", last_changed: "2026-10-17T11:40:00+00:00", last_updated: "2026-10-17T11:53:30+00:00",
      attributes: { friendly_name: "Kitchen speaker", media_title: "Sunday Morning", media_duration: 245, media_position: 83, media_position_updated_at: "2026-10-17T11:53:30+00:00", supported_features: 18877 },
    },
  } as HassEntities;
  const card = { cards: [{ entity: "media_player.kitchen", footprint: "featured" }] };

  it("draws a featured media player's progress line and clock, which run on by themselves", async () => {
    draw(card, speaker);
    await waitFor(() => expect(screen.getByText("Sunday Morning", { selector: ".mp-title" })).toBeTruthy());
    expect(document.querySelector(".mp-prog")).not.toBeNull();
  });

  it("draws no progress line or clock on a media player under the dashboard's quiet", async () => {
    draw({ ...card, quiet: true }, speaker);
    await waitFor(() => expect(screen.getByText("Sunday Morning", { selector: ".mp-title" })).toBeTruthy());
    expect(document.querySelector(".mp-prog")).toBeNull();
  });
});

describe("ConfigDashboard hour_cycle", () => {
  const changed = new Date(new Date().setHours(0, 5, 0, 0)).toISOString();
  const door = { "lock.front": { entity_id: "lock.front", state: "locked", last_changed: changed, last_updated: changed, attributes: { friendly_name: "Front door" } } } as HassEntities;

  it.each([["h12", "12:05\u00a0AM"], ["h23", "00:05"]] as const)("says every card's times on the YAML's %s", async (cycle, said) => {
    draw({ cards: ["lock.front"], hour_cycle: cycle }, door);
    await waitFor(() => expect(document.querySelector(".hd-area")?.textContent).toContain(said));
  });
});

describe("ConfigDashboard sensors listed on their own", () => {
  const sensors: HassEntities = {
    "sensor.office_co2": { entity_id: "sensor.office_co2", state: "812", attributes: { friendly_name: "Office air", device_class: "carbon_dioxide", unit_of_measurement: "ppm", state_class: "measurement" } },
    "sensor.office_temperature": { entity_id: "sensor.office_temperature", state: "21.4", attributes: { friendly_name: "Office", device_class: "temperature", unit_of_measurement: "\u00b0C", state_class: "measurement" } },
  };
  const cardOf = (name: string) => screen.getByRole("heading", { name }).closest(".hd") as HTMLElement;

  it("draws a CO\u2082 sensor listed on its own as the numeric card, and a temperature as the room sensor", async () => {
    draw({ cards: ["sensor.office_co2", "sensor.office_temperature"] }, sensors);
    await waitFor(() => expect(cardOf("Office air").classList.contains("nm")).toBe(true));
    expect(cardOf("Office").classList.contains("sw")).toBe(true);
  });

  it("keeps the room sensor where card: sensor says so, and numeric where card: numeric does", async () => {
    draw({ cards: [{ entity: "sensor.office_co2", card: "sensor" }, { entity: "sensor.office_temperature", card: "numeric" }] }, sensors);
    await waitFor(() => expect(cardOf("Office air").classList.contains("sw")).toBe(true));
    expect(cardOf("Office").classList.contains("nm")).toBe(true);
  });
});
