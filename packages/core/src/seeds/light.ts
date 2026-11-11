import { useMemo, useRef, useState } from "react";
import { eitherWay } from "../entities/assumed";
import type { LightEntity, LightHistory, HourSample } from "../entities/light/types";

/** Example data for stories. Times are fixed so screenshots stay stable. */
export const NOW = { hour: 11, minute: 54 };

/** What a lamp is set to, beyond on and off. */
type Levels = Pick<LightEntity, "brightness" | "kelvin" | "hs">;

export interface LightSeed {
  entity: LightEntity;
  /** Hours 0 to NOW.hour - 1. */
  past: HourSample[];
  /** Off, what the lamp lights at when it is switched on: Home Assistant reports none of it while the light is off. */
  lastSet?: Levels;
}

export const LIGHT_SEEDS = {
  dimmable: {
    entity: { entityId: "light.living_room_ceiling", name: "Ceiling", area: "Living room", state: "on", supportsBrightness: true, brightness: 80, supportsColorTemp: true, kelvin: 2700, lastChanged: "10:31" },
    past: [0, 0, 0, 0, 0, 0, 0.3, 0.6, 0.8, 0.8, 0.5],
  },
  /** Off, as Home Assistant reports it: no brightness and no warmth until it is on again. */
  dimmableOff: {
    entity: { entityId: "light.reading_lamp", name: "Reading lamp", area: "Living room", state: "off", supportsBrightness: true, supportsColorTemp: true, lastChanged: "09:12" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.7, 0.7, 0.4, 0],
    lastSet: { brightness: 70, kelvin: 3800 },
  },
  onOff: {
    entity: { entityId: "light.porch", name: "Porch light", area: "Porch", state: "on", supportsBrightness: false, brightness: 100, lastChanged: "11:20" },
    past: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  },
  /** A garden light, up with the dawn: a control whose screen is the only lit thing outside. */
  garden: {
    entity: { entityId: "light.garden", name: "Garden", area: "Outside", state: "on", supportsBrightness: true, brightness: 40, lastChanged: "05:40" },
    past: [0, 0, 0, 0, 0, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
  },
  unavailable: {
    entity: { entityId: "light.shelf_strip", name: "Shelf strip", area: "Living room", state: "unavailable", supportsBrightness: true, lastSeen: "10:42" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.3, 0.3, 0.3, "unavailable"],
  },
  nightLight: {
    entity: { entityId: "light.nova_night_light", name: "Night light", area: "Nursery", state: "on", supportsBrightness: true, brightness: 3, supportsColor: true, hs: [31.086, 94.488], lastChanged: "10:58" },
    past: [0, 0, 0.03, 0.03, 0, 0, 0.03, 0.03, 0, 0, 0.03],
  },
  coolDaylight: {
    entity: { entityId: "light.office_desk", name: "Desk lamp", area: "Office", state: "on", supportsBrightness: true, brightness: 60, supportsColorTemp: true, kelvin: 6500, lastChanged: "09:05" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.6],
  },
  dimmableNoWarmth: {
    entity: { entityId: "light.bedside", name: "Bedside", area: "Bedroom", state: "on", supportsBrightness: true, brightness: 25, lastChanged: "07:02" },
    past: [0, 0, 0, 0, 0, 0, 0.2, 0.25, 0, 0, 0],
  },
  whiteAndColour: {
    entity: { entityId: "light.desk_strip", name: "Desk strip", area: "Office", state: "on", supportsBrightness: true, brightness: 60, supportsColorTemp: true, kelvin: 4000, supportsColor: true, lastChanged: "09:40" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.6],
  },
  /** On, with no brightness reported yet. */
  noReading: {
    entity: { entityId: "light.hallway", name: "Hallway", state: "on", supportsBrightness: true },
    past: [null, null, null, null, null, null, null, null, null, null, null],
  },
  /**
   * Reachable, but not reported yet: an optimistic RF or MQTT light before its first command, or a light group before
   * its first state. It still switches and dims.
   */
  unknown: {
    entity: { entityId: "light.garden_string", name: "String lights", area: "Garden", state: "unknown", supportsBrightness: true, lastChanged: "06:00" },
    past: [0, 0, 0, 0, 0, 0, "unavailable", "unavailable", "unavailable", "unavailable", "unavailable"],
  },
  /** An RF lamp Home Assistant sends to but never hears back from (`assumed_state`): it shows off, and may not be. */
  assumed: {
    entity: { entityId: "light.porch_lantern", name: "Porch lantern", area: "Porch", state: "off", assumedState: true, supportsBrightness: false, lastChanged: "07:10" },
    past: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  },
} satisfies Record<string, LightSeed>;

export type LightSeedName = keyof typeof LIGHT_SEEDS;

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings. Long and compound names,
 * missing areas, readings at and past their limits, raw floats from integrations, no readings yet. Every skin's
 * Worst case story draws these.
 */
const zeros = (n: number) => Array<number>(n).fill(0);
const H = NOW.hour;
export const LIGHT_WORST_CASE: LightSeed[] = [
  { // A long name and area, full brightness, the coolest white
    entity: { entityId: "light.kitchen_island_pendant_cluster", name: "Kitchen island pendant cluster over the breakfast bar", area: "Kitchen and dining, ground floor", state: "on", supportsBrightness: true, brightness: 100, supportsColorTemp: true, kelvin: 6500, lastChanged: "23:59" },
    past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  { // German compound name, long area, 1%, a Kelvin value below the bulb's own minimum
    entity: { entityId: "light.wohnzimmer", name: "Wohnzimmerdeckenleuchte", area: "Primary bedroom suite, upstairs", state: "on", supportsBrightness: true, brightness: 1, supportsColorTemp: true, kelvin: 2000, minKelvin: 2202, maxKelvin: 6535, lastChanged: "11:54" },
    past: zeros(H),
  },
  { // No area, a raw float from an integration, a bulb whose warmth range is a single value
    entity: { entityId: "light.kitchen_island_left", name: "Kitchen island pendant (left)", state: "on", supportsBrightness: true, brightness: 99.6, supportsColorTemp: true, kelvin: 2700, minKelvin: 2700, maxKelvin: 2700, lastChanged: "06:00" },
    past: Array<number>(H).fill(1),
  },
  { // Two letters, never on today
    entity: { entityId: "light.jo", name: "Jo", area: "Porch", state: "off", supportsBrightness: false, lastChanged: "00:00" },
    past: zeros(H),
  },
];

/** The levels a light reports, leaving out the ones it doesn't. */
const pick = ({ brightness, kelvin, hs }: LightEntity): Levels => Object.fromEntries(Object.entries({ brightness, kelvin, hs }).filter(([, v]) => v != null));

const stamp = () => `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

/** Local state that behaves like a Home Assistant light, with today's history, for every skin's stories. */
export function useDemoLight(seed: LightSeed, overrides?: Partial<LightEntity>) {
  const [entity, setEntity] = useState<LightEntity>({ ...seed.entity, ...overrides });
  // What the lamp was last set to. Home Assistant reports none of it while the light is off, but the lamp keeps it,
  // so turning it back on lights it where it was.
  const last = useRef<Levels>({ ...seed.lastSet, ...pick(entity) });

  const history = useMemo<LightHistory>(() => {
    const on = entity.state === "on";
    // Home Assistant's history reads an unknown hour as one with no reading.
    const nowSample: HourSample = entity.state === "unavailable" || entity.state === "unknown" ? "unavailable" : on
      ? (entity.supportsBrightness ? (entity.brightness == null ? null : entity.brightness / 100) : 1)
      : 0;
    const samples: HourSample[] = [...seed.past, nowSample, ...Array(24 - seed.past.length - 1).fill(null)];
    const onMinutes = seed.past.filter((x) => typeof x === "number" && x > 0).length * 60 + (on ? NOW.minute : 0);
    return { samples, currentHour: NOW.hour, onMinutes };
  }, [entity, seed.past]);

  const update = (patch: Partial<LightEntity>) => setEntity((e) => {
    if (e.state === "unavailable") return e;
    const next = { ...e, ...patch, lastChanged: stamp() };
    if (next.state === "on") return next;
    // A lamp shows a colour temperature or a colour, never both: the one it was set to last wins.
    const levels = pick(next);
    last.current = { ...last.current, ...levels, ...(levels.kelvin != null ? { hs: undefined } : levels.hs ? { kelvin: undefined } : {}) };
    return { ...next, brightness: undefined, kelvin: undefined, hs: undefined };
  });
  // Switched on, a lamp with brightness that had none lights at full, as a new bulb does.
  const lit = (e: LightEntity): Partial<LightEntity> => ({
    state: "on",
    brightness: e.brightness ?? last.current.brightness ?? (e.supportsBrightness ? 100 : undefined),
    kelvin: e.kelvin ?? last.current.kelvin,
    hs: e.hs ?? last.current.hs,
  });

  return {
    entity,
    history,
    // As Home Assistant toggles it: anything but on turns on, unknown included.
    onToggle: () => update(entity.state === "on" ? { state: "off" } : lit(entity)),
    onBrightnessChange: (v: number) => update({ ...lit(entity), brightness: v }),
    // As Home Assistant reports it: a lamp shows a colour temperature or a colour, never both.
    onKelvinChange: (k: number) => update({ kelvin: k, hs: undefined }),
    onColorChange: (hs: [number, number]) => update({ ...lit(entity), hs, kelvin: undefined }),
    // As the handlers give them: only while its state is assumed or unknown.
    ...(eitherWay(entity) && { onTurnOn: () => update(lit(entity)), onTurnOff: () => update({ state: "off" }) }),
  };
}
