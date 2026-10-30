// Self-contained on purpose: scripts/deploy.mjs imports this file directly through Node's type stripping. It may
// import @scope/dashboard/layout, the package's pure layout entry, and nothing that reaches React.

import { areaId, byName, domainOf, placeSection, roomSensors, visibleEntities } from "@scope/dashboard/layout";
import type { AutoInput as LayoutInput } from "@scope/dashboard/layout";

export type { AutoInput, AutoState } from "@scope/dashboard/layout";

type Card = string | Record<string, unknown>;
interface Section { title: string; columns?: number; cards: Card[] }

/**
 * An Owlet sock's sleep state sensor: config.ts's SHARED_KINDS draws it as the owlet card. This file imports only
 * the package's pure layout entry (deploy runs it through Node), so the pattern is repeated; auto.test.ts fails
 * when the two drift apart.
 */
const OWLET = /^sensor\.\w+_sleep_state$/;

/**
 * A starting dashboard config for a house: actionable sections first, then household status, then
 * the outside and room glance. Automatic discovery cannot know which controls a person uses most,
 * so it keeps all discovered actions in deterministic domain/area order for the person to refine.
 * No featured hero is chosen; compact rows carry secondary controls.
 */
export function autoDashboard(input: LayoutInput, title = "Home"): Record<string, unknown> {
  const { states, areas = {} } = input;
  const visible = visibleEntities(input);
  const areaOf = (id: string) => {
    const area = areaId(input, id);
    return area && areas[area] ? area : undefined;
  };
  const sorted = (ids: string[]) => ids.sort(byName(states));
  const ofDomain = (...domains: string[]) => sorted(visible.filter((id) => domains.includes(domainOf(id))));

  const sections: Section[] = [];
  // One section per title: a section that would repeat one (an area called Nursery or Outside) joins it, so the
  // page never shows two sections of one name, and a nav to one never lands on the other.
  const place = (section: Section) => placeSection(sections, section);
  const alarms = ofDomain("alarm_control_panel");

  const weather = ofDomain("weather")[0];

  const climate = ofDomain("climate");
  if (climate.length) {
    place({ title: "Comfort", cards: climate.map((entity, i) => (i === 0 ? entity : { entity, footprint: "compact" })) });
  }

  // Room air: one card per device with a temperature (or, failing that, humidity) reading.
  const air: Card[] = roomSensors(input).map(({ entity, humidity, battery }) => (
    humidity || battery ? { entity, ...(humidity && { humidity }), ...(battery && { battery }) } : entity
  ));

  const modes = ofDomain("input_boolean");
  if (modes.length) place({ title: "Modes", columns: 2, cards: modes.map((entity) => ({ entity, footprint: "compact" })) });

  const socks = sorted(visible.filter((id) => OWLET.test(id)));

  // Controls, one section per area, then whatever has no area.
  const controls = ofDomain("cover", "light", "switch", "humidifier");
  const groups = new Map<string, string[]>();
  for (const id of controls) {
    const key = areaOf(id) ?? "";
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  const order = ["cover", "light", "switch", "humidifier"];
  const areaIds = [...groups.keys()].filter(Boolean).sort((a, b) => areas[a].name.localeCompare(areas[b].name));
  for (const key of [...areaIds, ""]) {
    const ids = groups.get(key);
    if (!ids) continue;
    ids.sort((a, b) => order.indexOf(domainOf(a)) - order.indexOf(domainOf(b)));
    place({ title: key ? areas[key].name : "Other", cards: ids.map((entity) => ({ entity, footprint: "compact" })) });
  }

  // Automatic discovery cannot infer true frequency. It puts every action first, then stable household
  // status, then read-only environmental context; authored dashboards pin their actual frequent actions.
  if (alarms.length) place({ title: "Security", cards: alarms.map((entity) => ({ entity, footprint: "compact" })) });
  if (socks.length) place({ title: "Nursery", cards: socks });
  if (weather) place({ title: "Outside", cards: [weather] });
  if (air.length) place({ title: "Rooms", cards: air });

  // Nothing to place yet (entities still loading, or no supported domain): stay in automatic mode.
  return sections.length ? { type: "custom:home-dashboard", title, sections } : { type: "custom:home-dashboard", title };
}

/** The Lovelace dashboard that holds the card: one panel view, so the card gets the full width. */
export function lovelaceDashboard(card: Record<string, unknown>, title = "Home"): Record<string, unknown> {
  return { views: [{ title, path: "home", type: "panel", cards: [card] }] };
}
