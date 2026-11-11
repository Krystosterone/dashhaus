import { useEffect, useMemo, useRef, useState } from "react";
import type { HourSample } from "../entities/history";
import type { CoverEntity, CoverHistory } from "../entities/cover/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

export interface CoverSeed {
  entity: CoverEntity;
  /** Hours 0 to NOW.hour - 1: how open each hour was. */
  past: HourSample[];
}

const base = { supportsPosition: true, supportsStop: true } as const;

export const COVER_SEEDS = {
  curtains: {
    entity: { ...base, entityId: "cover.living_room_curtains", name: "Curtains", area: "Living room", state: "open", deviceClass: "curtain", position: 70, lastChanged: "07:30" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.6, 0.7, 0.7, 0.7],
  },
  blind: {
    entity: { ...base, entityId: "cover.office_blind", name: "Blind", area: "Office", state: "open", deviceClass: "blind", position: 40, tilt: 50, supportsTilt: true, lastChanged: "09:12" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0.4],
  },
  shade: {
    entity: { ...base, entityId: "cover.bedroom_shade", name: "Roller shade", area: "Bedroom", state: "closed", deviceClass: "shade", position: 0, lastChanged: "Fri 22:40" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  moving: {
    entity: { ...base, entityId: "cover.patio_curtains", name: "Patio curtains", area: "Dining room", state: "closing", deviceClass: "curtain", position: 45, lastChanged: "11:54" },
    past: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  },
  /** It lifts to a position, and its slats only open and close (`OPEN_TILT`, `CLOSE_TILT`, no tilt position). */
  venetian: {
    entity: { ...base, entityId: "cover.kitchen_venetian", name: "Venetian blind", area: "Kitchen", state: "open", deviceClass: "blind", position: 100, tilt: 100, supportsTiltOpen: true, supportsTiltClose: true, supportsTiltStop: true, lastChanged: "08:05" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  },
  /** Slats and nothing else (no lift, no `open_cover`): opening it opens them. */
  slats: {
    entity: { entityId: "cover.bathroom_louvres", name: "Louvres", area: "Bathroom", state: "closed", deviceClass: "shutter", tilt: 0, supportsPosition: false, supportsOpen: false, supportsClose: false, supportsStop: true, supportsTilt: true, supportsTiltOpen: true, supportsTiltClose: true, supportsTiltStop: true, lastChanged: "07:15" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0],
  },
  garage: {
    entity: { entityId: "cover.garage_door", name: "Garage door", area: "Garage", state: "open", deviceClass: "garage", supportsPosition: false, supportsStop: true, lastChanged: "10:20" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0.6],
  },
  /** No position, on its way shut: neither open nor shut, so the figure is blank and the key stops it. */
  gate: {
    entity: { entityId: "cover.driveway_gate", name: "Driveway gate", area: "Outside", state: "closing", deviceClass: "gate", supportsPosition: false, supportsStop: true, lastChanged: "11:53" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0.1],
  },
  /**
   * A gate with a position, shut: one that opens part way for people on foot. Setting its position asks first, as
   * opening it does ("Move Front gate to 40%?"), and its quick positions are its ends alone.
   */
  frontGate: {
    entity: { ...base, entityId: "cover.front_gate", name: "Front gate", area: "Outside", state: "closed", deviceClass: "gate", position: 0, lastChanged: "08:40" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0, 0],
  },
  /**
   * Reachable, but never says where it is: a Somfy RTS blind, driven on an assumed state with no position. Home
   * Assistant still opens, closes and stops it, and so does the card.
   */
  unknown: {
    entity: { entityId: "cover.study_rts_blind", name: "Study blind", area: "Study", state: "unknown", deviceClass: "blind", supportsPosition: false, supportsStop: true, lastChanged: "06:00" },
    past: [0, 0, 0, 0, 0, 0, "unavailable", "unavailable", "unavailable", "unavailable", "unavailable"],
  },
  /**
   * Closed, as Home Assistant assumes: an RF blind it sends commands to but never hears back from (`assumed_state`).
   * It may not be where it's shown, so both ends act.
   */
  assumed: {
    entity: { entityId: "cover.nursery_rts_blind", name: "Nursery blind", area: "Nursery", state: "closed", deviceClass: "blind", supportsPosition: false, supportsStop: true, assumedState: true, lastChanged: "07:45" },
    past: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  },
  unavailable: {
    entity: { entityId: "cover.skylight", name: "Skylight", area: "Upstairs hall", state: "unavailable", deviceClass: "window", position: 30, supportsPosition: true, supportsStop: false, lastSeen: "08:20" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.3, "unavailable", "unavailable", "unavailable"],
  },
} satisfies Record<string, CoverSeed>;

export type CoverSeedName = keyof typeof COVER_SEEDS;

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings. Long and compound names,
 * missing areas, readings at and past their limits, raw floats from integrations, no readings yet. Every skin's
 * Worst case story draws these.
 */
export const COVER_WORST_CASE: CoverSeed[] = [
  { // A long name, curtains a hair from closed, moving, with no stop
    entity: { entityId: "cover.salon", name: "Rideaux du grand salon (côté jardin)", area: "Salon", state: "closing", deviceClass: "curtain", position: 1, supportsPosition: true, supportsStop: false, lastChanged: "21:59" },
    past: [],
  },
  { // A gate with no area and no history, left open, never reported when it changed
    entity: { entityId: "cover.gate", name: "Gate", state: "open", deviceClass: "gate", supportsPosition: false, supportsStop: false },
    past: [],
  },
  { // A long name and area, a raw float position, a door left open: its warning on the screen
    entity: { entityId: "cover.garage_side", name: "Garage side door to the back garden", area: "Garage and workshop (north side)", state: "open", deviceClass: "door", position: 99.6, supportsPosition: true, supportsStop: true, lastChanged: "Fri 18:30" },
    past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  { // A gate on its way shut that can't be stopped: its control lies flat and says where it is going
    entity: { entityId: "cover.side_gate", name: "Side gate", area: "Outside", state: "closing", deviceClass: "gate", supportsPosition: false, supportsStop: false, lastChanged: "21:58" },
    past: [],
  },
  { // Slats at their end, a raw float tilt
    entity: { entityId: "cover.studio_blind", name: "Studio skylight blind", area: "Attic", state: "open", deviceClass: "blind", position: 100, tilt: 0.4, supportsPosition: true, supportsStop: false, supportsTilt: true, lastChanged: "06:02" },
    past: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
  },
];

/**
 * Local state that behaves like a Home Assistant cover, including travel: it moves 5% every 250ms
 * toward its target (a full run takes about 5 s) and can be stopped on the way. Covers without a
 * position take 3 s to open or close.
 */
export function useDemoCover(seed: CoverSeed) {
  const [entity, setEntity] = useState<CoverEntity>(seed.entity);
  const target = useRef<number | null>(null);

  useEffect(() => {
    if (entity.state !== "opening" && entity.state !== "closing") return;
    if (target.current == null) return;
    if (!entity.supportsPosition || entity.position == null) {
      const e0 = entity;
      const t = window.setTimeout(() => {
        // A cover that only tilts opens and closes its slats.
        const onlyTilts = !e0.supportsPosition && e0.supportsOpen === false && e0.supportsClose === false;
        setEntity((e) => ({ ...e, state: target.current! > 0 ? "open" : "closed", ...(onlyTilts && { tilt: target.current! > 0 ? 100 : 0 }), lastChanged: stamp }));
        target.current = null;
      }, 3000);
      return () => window.clearTimeout(t);
    }
    const t = window.setInterval(() => {
      setEntity((e) => {
        const goal = target.current ?? e.position!;
        const p = e.position!;
        const next = p < goal ? Math.min(goal, p + 5) : Math.max(goal, p - 5);
        if (next === goal) { target.current = null; return { ...e, position: next, state: next > 0 ? "open" : "closed", lastChanged: stamp }; }
        return { ...e, position: next };
      });
    }, 250);
    return () => window.clearInterval(t);
    // The interval reads position through the functional setState, so it must NOT restart every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity.state, entity.supportsPosition, entity.position == null]);

  const moveTo = (goal: number) => setEntity((e) => {
    if (e.state === "unavailable") return e;
    // Unknown, it could be anywhere, so it travels whichever way it's sent.
    const from = e.position ?? (e.state === "unknown" ? 100 - goal : e.state === "open" ? 100 : 0);
    if (goal === from) return e;
    target.current = goal;
    return { ...e, state: goal > from ? "opening" : "closing" };
  });

  const history = useMemo<CoverHistory>(() => {
    // Home Assistant's history reads an unknown hour as one with no reading.
    const now: HourSample = entity.state === "unavailable" || entity.state === "unknown" ? "unavailable" : (entity.position ?? (entity.state === "open" ? 100 : 0)) / 100;
    return { samples: [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)], currentHour: NOW.hour };
  }, [entity, seed.past]);

  return {
    entity,
    history,
    onOpenCover: () => moveTo(100),
    onCloseCover: () => moveTo(0),
    onStopCover: () => {
      target.current = null;
      setEntity((e) => (e.state !== "opening" && e.state !== "closing" ? e : { ...e, state: (e.position ?? 100) > 0 ? "open" : "closed", lastChanged: stamp }));
    },
    onSetPosition: (p: number) => moveTo(p),
    onSetTilt: (t: number) => setEntity((e) => ({ ...e, tilt: t, lastChanged: stamp })),
  };
}
