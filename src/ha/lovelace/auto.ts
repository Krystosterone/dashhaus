// Self-contained on purpose: scripts/deploy.mjs imports this file directly through Node's type stripping,
// so it may only use `import type`.

/** A raw state, as far as the layout needs one. */
export interface AutoState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

/** Registry facts per entity: the shape of the frontend's `hass.entities`. */
export interface AutoEntityEntry {
  device_id?: string | null;
  area_id?: string | null;
  hidden?: boolean;
  /** "config" or "diagnostic" entities are plumbing, never dashboard content. */
  entity_category?: string | null;
}

export interface AutoInput {
  states: Record<string, AutoState>;
  entities?: Record<string, AutoEntityEntry>;
  devices?: Record<string, { area_id?: string | null }>;
  areas?: Record<string, { name: string }>;
}

type Card = string | Record<string, unknown>;
interface Section { title: string; columns?: number; cards: Card[] }

const domainOf = (id: string) => id.slice(0, id.indexOf("."));
const deviceClass = (s: AutoState) => (typeof s.attributes.device_class === "string" ? s.attributes.device_class : undefined);
const byName = (states: Record<string, AutoState>) => (a: string, b: string) => {
  const name = (id: string) => String(states[id]?.attributes.friendly_name ?? id);
  return name(a).localeCompare(name(b));
};

/**
 * An Owlet sock's sleep state sensor: config.ts's SHARED_KINDS draws it as the owlet widget. This file may only
 * `import type`, so the pattern is repeated; auto.test.ts fails when the two drift apart.
 */
const OWLET = /^sensor\.\w+_sleep_state$/;

/**
 * A starting dashboard config for a house: actionable sections first, then household status, then
 * the outside and room glance. Automatic discovery cannot know which controls a person uses most,
 * so it keeps all discovered actions in deterministic domain/area order for the person to refine.
 * No featured hero is chosen; compact rows carry secondary controls.
 */
export function autoDashboard(input: AutoInput, title = "Home"): Record<string, unknown> {
  const { states, entities = {}, devices = {}, areas = {} } = input;
  const visible = Object.keys(states).filter((id) => {
    const entry = entities[id];
    return !entry?.hidden && !entry?.entity_category;
  });
  const deviceOf = (id: string) => entities[id]?.device_id ?? undefined;
  const areaOf = (id: string) => {
    const entry = entities[id];
    const areaId = entry?.area_id ?? (entry?.device_id ? devices[entry.device_id]?.area_id : undefined);
    return areaId && areas[areaId] ? areaId : undefined;
  };
  const sorted = (ids: string[]) => ids.sort(byName(states));
  const ofDomain = (...domains: string[]) => sorted(visible.filter((id) => domains.includes(domainOf(id))));

  const sections: Section[] = [];
  const alarms = ofDomain("alarm_control_panel");

  const weather = ofDomain("weather")[0];

  const climate = ofDomain("climate");
  if (climate.length) {
    sections.push({ title: "Comfort", cards: climate.map((entity, i) => (i === 0 ? entity : { entity, footprint: "compact" })) });
  }

  // Room air: one card per device with a temperature (or, failing that, humidity) reading.
  const sensors = visible.filter((id) => domainOf(id) === "sensor");
  // Companions may be diagnostic entities (batteries usually are); only hidden ones are left out.
  const companions = Object.keys(states).filter((id) => domainOf(id) === "sensor" && !entities[id]?.hidden);
  const companion = (device: string | undefined, cls: string) => (
    device ? companions.find((id) => deviceOf(id) === device && deviceClass(states[id]) === cls) : undefined
  );
  const taken = new Set<string>();
  const air: Card[] = [];
  for (const cls of ["temperature", "humidity"]) {
    for (const id of sorted(sensors.filter((s) => deviceClass(states[s]) === cls))) {
      const device = deviceOf(id);
      if (taken.has(id) || (device && taken.has(`device:${device}`))) continue;
      if (device) taken.add(`device:${device}`);
      taken.add(id);
      const humidity = cls === "temperature" ? companion(device, "humidity") : undefined;
      const battery = companion(device, "battery");
      air.push(humidity || battery ? { entity: id, ...(humidity && { humidity }), ...(battery && { battery }) } : id);
    }
  }

  const modes = ofDomain("input_boolean");
  if (modes.length) sections.push({ title: "Modes", columns: 2, cards: modes.map((entity) => ({ entity, footprint: "compact" })) });

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
    sections.push({ title: key ? areas[key].name : "Other", cards: ids.map((entity) => ({ entity, footprint: "compact" })) });
  }

  // Automatic discovery cannot infer true frequency. It puts every action first, then stable household
  // status, then read-only environmental context; authored dashboards pin their actual frequent actions.
  if (alarms.length) sections.push({ title: "Security", cards: alarms.map((entity) => ({ entity, footprint: "compact" })) });
  if (socks.length) sections.push({ title: "Nursery", cards: socks });
  if (weather) sections.push({ title: "Outside", cards: [weather] });
  if (air.length) sections.push({ title: "Rooms", cards: air });

  // Nothing to place yet (entities still loading, or no supported domain): stay in automatic mode.
  return sections.length ? { type: "custom:home-dashboard", title, sections } : { type: "custom:home-dashboard", title };
}

/** The Lovelace dashboard that holds the card: one panel view, so the card gets the full width. */
export function lovelaceDashboard(card: Record<string, unknown>, title = "Home"): Record<string, unknown> {
  return { views: [{ title, path: "home", type: "panel", cards: [card] }] };
}
