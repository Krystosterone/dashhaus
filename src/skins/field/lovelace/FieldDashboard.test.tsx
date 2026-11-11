import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import { parseFieldConfig } from "./config";
import { FieldDashboard } from "./FieldDashboard";

/*
 * What the dashboard hands its modules from its own YAML: the settings every module of a kind follows. The modules'
 * own drawing is tested beside each; the card element's, in card.test.tsx.
 */
const speaker = {
  "media_player.kitchen": {
    entity_id: "media_player.kitchen", state: "playing", last_changed: "2026-10-17T11:40:00+00:00", last_updated: "2026-10-17T11:53:30+00:00",
    attributes: { friendly_name: "Kitchen speaker", media_title: "Sunday Morning", media_duration: 245, media_position: 83, media_position_updated_at: "2026-10-17T11:53:30+00:00", supported_features: 18877 },
  },
} as HassEntities;

function draw(yaml: Record<string, unknown>) {
  const config = parseFieldConfig(yaml);
  return renderConnected(<FieldDashboard rows={config.rows ?? []} footprint={config.footprint} quiet={config.quiet} stills={config.stills} nav={false} />, speaker);
}

beforeEach(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });

describe("FieldDashboard quiet", () => {
  it("draws a media player's progress rule, which runs on by itself", async () => {
    draw({ cards: ["media_player.kitchen"] });
    await waitFor(() => expect(screen.getByText("Sunday Morning")).toBeTruthy());
    expect(document.querySelector(".fd-mp-prog")).not.toBeNull();
  });

  it("draws no progress rule or running clock on a media player under the dashboard's quiet", async () => {
    draw({ cards: ["media_player.kitchen"], quiet: true });
    await waitFor(() => expect(screen.getByText("Sunday Morning")).toBeTruthy());
    expect(document.querySelector(".fd-mp-prog")).toBeNull();
    expect(document.querySelector(".fd-mp-clock")).toBeNull();
  });
});

describe("FieldDashboard hour_cycle", () => {
  const changed = new Date(new Date().setHours(0, 5, 0, 0)).toISOString();
  const door = { "lock.front": { entity_id: "lock.front", state: "locked", last_changed: changed, last_updated: changed, attributes: { friendly_name: "Front door" } } } as HassEntities;

  it.each([["h12", "Since 12:05\u00a0AM"], ["h23", "Since 00:05"]] as const)("says every module's times on the YAML's %s", async (cycle, said) => {
    const config = parseFieldConfig({ cards: ["lock.front"], hour_cycle: cycle });
    renderConnected(<FieldDashboard rows={config.rows ?? []} hourCycle={config.hourCycle} footprint={config.footprint} nav={false} />, door);
    await waitFor(() => expect(document.querySelector(".fd-meta")?.textContent).toContain(said));
  });
});

describe("FieldDashboard sensors listed on their own", () => {
  const sensors = {
    "sensor.office_co2": { entity_id: "sensor.office_co2", state: "812", attributes: { friendly_name: "Office air", device_class: "carbon_dioxide", unit_of_measurement: "ppm", state_class: "measurement" } },
    "sensor.office_temperature": { entity_id: "sensor.office_temperature", state: "21.4", attributes: { friendly_name: "Office", device_class: "temperature", unit_of_measurement: "°C", state_class: "measurement" } },
  } as HassEntities;
  const drawn = (yaml: Record<string, unknown>) => {
    const config = parseFieldConfig(yaml);
    renderConnected(<FieldDashboard rows={config.rows ?? []} footprint={config.footprint} nav={false} />, sensors);
  };
  const moduleOf = (name: string) => screen.getByRole("heading", { name }).closest(".fd-module") as HTMLElement;

  it("draws a CO₂ sensor listed on its own as the numeric module, and a temperature as the room sensor", async () => {
    drawn({ cards: ["sensor.office_co2", "sensor.office_temperature"] });
    await waitFor(() => expect(moduleOf("Office air").classList.contains("fd-nm")).toBe(true));
    expect(moduleOf("Office").classList.contains("fd-sw")).toBe(true);
  });

  it("keeps the room sensor where card: sensor says so, and numeric where card: numeric does", async () => {
    drawn({ cards: [{ entity: "sensor.office_co2", card: "sensor" }, { entity: "sensor.office_temperature", card: "numeric" }] });
    await waitFor(() => expect(moduleOf("Office air").classList.contains("fd-sw")).toBe(true));
    expect(moduleOf("Office").classList.contains("fd-nm")).toBe(true);
  });
});

describe("FieldDashboard column stacks", () => {
  const row = (footprint: "standard" | "compact") => ({
    rows: [{
      columns: 4,
      cards: [1, 2, 3, 4].flatMap((column) => [
        { entity: "media_player.kitchen", column, footprint: "standard" },
        { entity: "media_player.kitchen", column, footprint },
      ]),
    }],
  });
  // Field's page at its widest: 1240 px, less its 16 px each side.
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 1208 } as DOMRect);
    return () => vi.restoreAllMocks();
  });

  it("keeps a compact row's 300 px track where the stacks hold one, so its name stays whole: three across", async () => {
    draw(row("compact"));
    await waitFor(() => expect(document.querySelector(".fd-dash-grid")?.getAttribute("data-tracks")).toBe("3"));
  });

  it("takes a module's 260 px track where they hold whole modules only: four across", async () => {
    draw(row("standard"));
    await waitFor(() => expect(document.querySelector(".fd-dash-grid")?.getAttribute("data-tracks")).toBe("4"));
  });
});

describe("FieldDashboard wall", () => {
  const wall = vi.fn((across: number) => [{
    columns: across, flow: "normal" as const, align: "top" as const, stacks: true,
    cards: Array.from({ length: across }, (_, c) => c + 1).flatMap((column) => [
      { item: { kind: "mediaPlayer" as const, entity: "media_player.kitchen", footprint: "standard" as const }, width: 1, column },
      { item: { kind: "mediaPlayer" as const, entity: "media_player.kitchen", footprint: "compact" as const }, width: 1, column },
    ]),
  }]);
  const at = (width: number, viewing: "near" | "far" = "near") => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width } as DOMRect);
    renderConnected(<FieldDashboard rows={wall} viewing={viewing} footprint="standard" nav={false} />, speaker);
  };
  beforeEach(() => {
    wall.mockClear();
    return () => vi.restoreAllMocks();
  });

  it("takes the whole width, past the 1240 px every other page stops at", () => {
    at(1236);
    expect(document.querySelector(".fd-dash")?.hasAttribute("data-wall")).toBe(true);
  });

  it("puts as many areas across as a row's 300 px track fits: four where four fit whole, three a pixel short", async () => {
    at(1236);
    await waitFor(() => expect(document.querySelector(".fd-dash-grid")?.getAttribute("data-tracks")).toBe("4"));
    expect(wall).toHaveBeenLastCalledWith(4);
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    at(1235);
    await waitFor(() => expect(wall).toHaveBeenLastCalledWith(3));
  });

  it("gives each area 340 px read from across the room, where a row's name a step up needs it: three at a 1280 px panel", async () => {
    at(1248, "far");
    await waitFor(() => expect(wall).toHaveBeenLastCalledWith(3));
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    at(1396, "far");
    await waitFor(() => expect(wall).toHaveBeenLastCalledWith(4));
  });

  it("draws three across until it is measured", () => {
    at(0);
    expect(wall).toHaveBeenLastCalledWith(3);
  });
});
