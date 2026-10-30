import { useMemo, useState } from "react";
import type { HourSample, LightEntity, LightHistory } from "@dashhaus/core/entities/light/types";

/** Example time for stories, fixed so screenshots stay stable. */
export const NOW = { hour: 11, minute: 54 };

/** Example lights for stories. */
export const SEEDS = {
  dimmable: { entityId: "light.living_room_ceiling", name: "Ceiling", area: "Living room", state: "on", supportsBrightness: true, brightness: 80, supportsColorTemp: true, kelvin: 2700, lastChanged: "10:31" },
  off: { entityId: "light.reading_lamp", name: "Reading lamp", area: "Living room", state: "off", supportsBrightness: true, brightness: 70, supportsColorTemp: true, kelvin: 3800, lastChanged: "09:12" },
  colour: { entityId: "light.night_light", name: "Night light", area: "Nursery", state: "on", supportsBrightness: true, brightness: 3, supportsColor: true, hs: [31, 94], lastChanged: "10:58" },
  whiteAndColour: { entityId: "light.desk_strip", name: "Desk strip", area: "Office", state: "on", supportsBrightness: true, brightness: 60, supportsColorTemp: true, kelvin: 4000, supportsColor: true, lastChanged: "09:40" },
  onOff: { entityId: "light.porch", name: "Porch light", area: "Porch", state: "on", supportsBrightness: false, lastChanged: "11:20" },
  unavailable: { entityId: "light.shelf_strip", name: "Shelf strip", area: "Living room", state: "unavailable", supportsBrightness: true, brightness: 30, supportsColorTemp: true, kelvin: 3000, lastSeen: "10:42" },
  worstCase: { entityId: "light.kitchen_island_pendant_cluster", name: "Kitchen island pendant cluster over the breakfast bar", area: "Kitchen and dining, ground floor", state: "on", supportsBrightness: true, brightness: 100, supportsColorTemp: true, kelvin: 6500, lastChanged: "23:59" },
  noReading: { entityId: "light.hallway", name: "Hallway", state: "on", supportsBrightness: true },
} satisfies Record<string, LightEntity>;

export type SeedName = keyof typeof SEEDS;

/** Each light's hours before NOW.hour. */
const PAST: Record<SeedName, HourSample[]> = {
  dimmable: [0, 0, 0, 0, 0, 0, 0.3, 0.6, 0.8, 0.8, 0.5],
  off: [0, 0, 0, 0, 0, 0, 0, 0.7, 0.7, 0.4, 0],
  colour: [0, 0, 0.03, 0.03, 0, 0, 0.03, 0.03, 0, 0, 0.03],
  whiteAndColour: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.6],
  onOff: [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  unavailable: [0, 0, 0, 0, 0, 0, 0, 0.3, 0.3, 0.3, "unavailable"],
  worstCase: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  noReading: [null, null, null, null, null, null, null, null, null, null, null],
};

const stamp = () => `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

/** Local state that behaves like a Home Assistant light, with today's history, for stories. */
export function useDemoLight(name: SeedName) {
  const [entity, setEntity] = useState<LightEntity>(SEEDS[name]);
  const past = PAST[name];

  const history = useMemo<LightHistory>(() => {
    const on = entity.state === "on";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : on ? (entity.supportsBrightness ? (entity.brightness == null ? null : entity.brightness / 100) : 1) : 0;
    const samples: HourSample[] = [...past, now, ...Array(24 - past.length - 1).fill(null)];
    const onMinutes = past.filter((x) => typeof x === "number" && x > 0).length * 60 + (on ? NOW.minute : 0);
    return { samples, currentHour: NOW.hour, onMinutes };
  }, [entity, past]);

  const update = (patch: Partial<LightEntity>) => setEntity((e) => (e.state === "unavailable" ? e : { ...e, ...patch, lastChanged: stamp() }));
  return {
    entity,
    history,
    onToggle: () => update({ state: entity.state === "on" ? "off" : "on" }),
    onBrightnessChange: (v: number) => update({ brightness: v, state: "on" }),
    // As Home Assistant reports it: a lamp shows a colour temperature or a colour, never both.
    onKelvinChange: (k: number) => update({ kelvin: k, hs: undefined }),
    onColorChange: (hs: [number, number]) => update({ hs, kelvin: undefined, state: "on" }),
  };
}
