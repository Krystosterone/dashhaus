// Self-contained on purpose: the repo's dashboard.config.mjs imports this file through Node's type stripping for
// deploy. It may import @dashhaus/core/lovelace/layout, the package's pure layout entry, and nothing that reaches React.

import { areaId, byName, deviceCompanion, domainOf, numericSensors, placeSection, roomSensors, safetySensors, visibleEntities } from "@dashhaus/core/lovelace/layout";
import type { AutoInput as LayoutInput } from "@dashhaus/core/lovelace/layout";

export type { AutoInput, AutoState } from "@dashhaus/core/lovelace/layout";

type Card = string | Record<string, unknown>;
interface Row { title: string; columns?: number; cards: Card[] }

/**
 * An Owlet sock's sleep state sensor: config.ts's SHARED_KINDS draws it as the owlet card. This file imports only
 * the package's pure layout entry (deploy runs it through Node), so the pattern is repeated; auto.test.ts fails
 * when the two drift apart.
 */
const OWLET = /^sensor\.\w+_sleep_state$/;
/** UniFi Hotspot Manager's guest Wi-Fi code: SHARED_KINDS draws it as the guestWifi card, its pattern repeated here too. */
const VOUCHER = /^sensor\.\w+_voucher$/;

/**
 * A starting dashboard config for a house, as titled `rows`: actionable rows first, then household status, then
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

  const rows: Row[] = [];
  // One row per title: a row that would repeat one (an area called Nursery or Outside) joins it, so the page never
  // shows two rows of one name, and a nav to one never lands on the other.
  const place = (row: Row) => placeSection(rows, row);
  const alarms = ofDomain("alarm_control_panel");
  // Locks join the alarm under Security, each with its device's battery where it has one.
  const locks: Card[] = ofDomain("lock").map((entity) => {
    const battery = deviceCompanion(input, entity, "battery");
    return { entity, footprint: "compact", ...(battery && { battery }) };
  });
  // Then the safety glance: doors, windows, leaks and smoke (`SAFETY_CLASSES`), each with its device's battery.
  const safety: Card[] = safetySensors(input).map(({ entity, battery }) => ({ entity, footprint: "compact", ...(battery && { battery }) }));

  // Cameras, each at its standard footprint so its still shows (a compact row never draws one), by name.
  const cameras = ofDomain("camera");

  const weather = ofDomain("weather")[0];

  const climate = ofDomain("climate");
  if (climate.length) {
    place({ title: "Comfort", cards: climate.map((entity, i) => (i === 0 ? entity : { entity, footprint: "compact" })) });
  }

  // Room air: one card per device with a temperature (or, failing that, humidity) reading.
  const air: Card[] = roomSensors(input).map(({ entity, humidity, battery }) => (
    humidity || battery ? { entity, ...(humidity && { humidity }), ...(battery && { battery }) } : entity
  ));
  // Then the room's air quality, one numeric reading per device (`NUMERIC_CLASSES`: CO₂ first). The sensor card stays
  // the domain's default, so these name their card.
  air.push(...numericSensors(input).map((entity) => ({ entity, card: "numeric" })));

  const modes = ofDomain("input_boolean");
  if (modes.length) place({ title: "Modes", columns: 2, cards: modes.map((entity) => ({ entity, footprint: "compact" })) });

  const socks = sorted(visible.filter((id) => OWLET.test(id)));
  const wifi = sorted(visible.filter((id) => VOUCHER.test(id)));
  const calendars = ofDomain("calendar");

  // Controls, one row per area, then whatever has no area.
  const controls = ofDomain(
    "cover",
    "light",
    "switch",
    "humidifier",
    "fan",
    "media_player",
    "vacuum",
    // new-card: auto controls
  );
  const groups = new Map<string, string[]>();
  for (const id of controls) {
    const key = areaOf(id) ?? "";
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }
  const order = [
    "cover",
    "light",
    "switch",
    "humidifier",
    "fan",
    "media_player",
    "vacuum",
    // new-card: auto order
  ];
  const areaIds = [...groups.keys()].filter(Boolean).sort((a, b) => areas[a].name.localeCompare(areas[b].name));
  for (const key of [...areaIds, ""]) {
    const ids = groups.get(key);
    if (!ids) continue;
    ids.sort((a, b) => order.indexOf(domainOf(a)) - order.indexOf(domainOf(b)));
    place({ title: key ? areas[key].name : "Other", cards: ids.map((entity) => ({ entity, footprint: "compact" })) });
  }

  // Automatic discovery cannot infer true frequency. It puts every action first, then the status bands, the most
  // pressing first, then read-only environmental context; authored dashboards pin their actual frequent actions. A
  // row for a new kind goes at the end of its band (spec/deploy.md → The automatic layout's order).
  // Safety and security.
  if (alarms.length || locks.length || safety.length) place({ title: "Security", cards: [...alarms.map((entity) => ({ entity, footprint: "compact" })), ...locks, ...safety] });
  // Security-adjacent: what the doors and the nursery look like, right after what guards them.
  if (cameras.length) place({ title: "Cameras", cards: cameras });
  // Household status: the nursery, then the guest Wi-Fi code a visitor reads, then the calendars; a new household-status
  // row goes after them.
  if (socks.length) place({ title: "Nursery", cards: socks });
  if (wifi.length) place({ title: "Guests", cards: wifi });
  // Every calendar, what's next and when: after the guests, before the glance.
  if (calendars.length) place({ title: "Calendar", cards: calendars });
  // The glance.
  if (weather) place({ title: "Outside", cards: [weather] });
  if (air.length) place({ title: "Rooms", cards: air });

  // Nothing to place yet (entities still loading, or no supported domain): stay in automatic mode.
  return rows.length ? { type: "custom:dashhaus-orb", title, rows } : { type: "custom:dashhaus-orb", title };
}
