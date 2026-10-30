import { useMemo, useState } from "react";
import type { LightEntity, LightHistory, HourSample } from "@dashhaus/core/entities/light/types";

/** Example data for stories. Times are fixed so screenshots stay stable. */
export const NOW = { hour: 11, minute: 54 };

export interface DemoSeed {
  entity: LightEntity;
  /** Hours 0 to NOW.hour - 1. */
  past: HourSample[];
}

export const SEEDS = {
  dimmable: {
    entity: { entityId: "light.living_room_ceiling", name: "Ceiling", area: "Living room", state: "on", supportsBrightness: true, brightness: 80, supportsColorTemp: true, kelvin: 2700, lastChanged: "10:31" },
    past: [0, 0, 0, 0, 0, 0, 0.3, 0.6, 0.8, 0.8, 0.5],
  },
  dimmableOff: {
    entity: { entityId: "light.reading_lamp", name: "Reading lamp", area: "Living room", state: "off", supportsBrightness: true, brightness: 70, supportsColorTemp: true, kelvin: 3800, lastChanged: "09:12" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.7, 0.7, 0.4, 0],
  },
  onOff: {
    entity: { entityId: "light.porch", name: "Porch light", area: "Porch", state: "on", supportsBrightness: false, brightness: 100, lastChanged: "11:20" },
    past: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  },
  unavailable: {
    entity: { entityId: "light.shelf_strip", name: "Shelf strip", area: "Living room", state: "unavailable", supportsBrightness: true, brightness: 30, lastSeen: "10:42" },
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
} satisfies Record<string, DemoSeed>;

export type SeedName = keyof typeof SEEDS;

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings. Long and compound names,
 * missing areas, readings at and past their limits, raw floats from integrations, no readings yet. The card's
 * Worst case story and Orb → Foundations → Worst case both draw these.
 */
const zeros = (n: number) => Array<number>(n).fill(0);
const H = NOW.hour;
export const LIGHT_WORST_CASE: DemoSeed[] = [
  { // German compound name, long area, 1%, a Kelvin value below the bulb's own minimum
    entity: { entityId: "light.wohnzimmer", name: "Wohnzimmerdeckenleuchte", area: "Primary bedroom suite, upstairs", state: "on", supportsBrightness: true, brightness: 1, supportsColorTemp: true, kelvin: 2000, minKelvin: 2202, maxKelvin: 6535, lastChanged: "11:54" },
    past: zeros(H),
  },
  { // No area, a raw float from an integration, a bulb whose warmth range is a single value
    entity: { entityId: "light.kitchen_island_left", name: "Kitchen island pendant (left)", state: "on", supportsBrightness: true, brightness: 99.6, supportsColorTemp: true, kelvin: 2700, minKelvin: 2700, maxKelvin: 2700, lastChanged: "06:00" },
    past: Array<number>(H).fill(1),
  },
  { // Two letters, never on today
    entity: { entityId: "light.jo", name: "Jo", area: "Porch", state: "off", supportsBrightness: false, brightness: 100, lastChanged: "00:00" },
    past: zeros(H),
  },
];

const stamp = () => `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

/** Local state that behaves like a Home Assistant light, for stories and prototypes. */
export function useDemoLight(seed: DemoSeed, overrides?: Partial<LightEntity>) {
  const [entity, setEntity] = useState<LightEntity>({ ...seed.entity, ...overrides });

  const history = useMemo<LightHistory>(() => {
    const on = entity.state === "on";
    const nowSample: HourSample = entity.state === "unavailable" ? "unavailable" : on
      ? (entity.supportsBrightness ? (entity.brightness == null ? null : entity.brightness / 100) : 1)
      : 0;
    const samples: HourSample[] = [...seed.past, nowSample, ...Array(24 - seed.past.length - 1).fill(null)];
    const onMinutes = seed.past.filter((x) => typeof x === "number" && x > 0).length * 60 + (on ? NOW.minute : 0);
    return { samples, currentHour: NOW.hour, onMinutes };
  }, [entity, seed.past]);

  const update = (patch: Partial<LightEntity>) => setEntity((e) => (e.state === "unavailable" ? e : { ...e, ...patch, lastChanged: stamp() }));

  return {
    entity,
    history,
    onToggle: () => update({ state: entity.state === "on" ? "off" : "on" }),
    onBrightnessChange: (v: number) => update({ brightness: v, state: "on" }),
    onKelvinChange: (k: number) => update({ kelvin: k }),
    onColorChange: (hs: [number, number]) => update({ hs, state: "on" }),
  };
}
