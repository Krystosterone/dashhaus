import { useEffect, useMemo, useRef, useState } from "react";
import type { HourSample } from "../../../shared/ui";
import type { CoverEntity, CoverHistory } from "../../../../../domains/cover/types";

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
  garage: {
    entity: { entityId: "cover.garage_door", name: "Garage door", area: "Garage", state: "open", deviceClass: "garage", supportsPosition: false, supportsStop: true, lastChanged: "10:20" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0.6],
  },
  unavailable: {
    entity: { entityId: "cover.skylight", name: "Skylight", area: "Upstairs hall", state: "unavailable", deviceClass: "window", position: 30, supportsPosition: true, supportsStop: false, lastSeen: "08:20" },
    past: [0, 0, 0, 0, 0, 0, 0, 0.3, "unavailable", "unavailable", "unavailable"],
  },
} satisfies Record<string, CoverSeed>;

export type CoverSeedName = keyof typeof COVER_SEEDS;

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
      const t = window.setTimeout(() => {
        setEntity((e) => ({ ...e, state: target.current! > 0 ? "open" : "closed", lastChanged: stamp }));
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
    const from = e.position ?? (e.state === "open" ? 100 : 0);
    if (goal === from) return e;
    target.current = goal;
    return { ...e, state: goal > from ? "opening" : "closing" };
  });

  const history = useMemo<CoverHistory>(() => {
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : (entity.position ?? (entity.state === "open" ? 100 : 0)) / 100;
    return { samples: [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)], currentHour: NOW.hour };
  }, [entity, seed.past]);

  return {
    entity,
    history,
    onOpenCover: () => moveTo(100),
    onCloseCover: () => moveTo(0),
    onStopCover: () => {
      target.current = null;
      setEntity((e) => ({ ...e, state: (e.position ?? 100) > 0 ? "open" : "closed", lastChanged: stamp }));
    },
    onSetPosition: (p: number) => moveTo(p),
    onSetTilt: (t: number) => setEntity((e) => ({ ...e, tilt: t, lastChanged: stamp })),
  };
}
