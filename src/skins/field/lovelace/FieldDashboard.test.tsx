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
