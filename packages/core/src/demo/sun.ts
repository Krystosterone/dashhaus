import type { HaTransport, HassEntity } from "../ha/types";
import { sunEvents, sunPosition, HORIZON } from "../entities/sun/position";
import { demoConfig } from "./messages";
import { createDemoTransport } from "./transport";

const iso = (ms: number | undefined) => (ms === undefined ? undefined : new Date(ms).toISOString());

/**
 * `sun.sun` as Home Assistant's `sun` integration reports it at `now`, at the demo home (`demoConfig`): its state, its
 * next dawn, sunrise, noon, sunset and dusk, and where it is.
 */
export function demoSun(now: number = Date.now()): HassEntity {
  const { latitude, longitude } = demoConfig();
  const { elevation, azimuth } = sunPosition(now, latitude, longitude);
  const events = sunEvents(now, latitude, longitude);
  const stamp = new Date(now).toISOString();
  return {
    entity_id: "sun.sun",
    state: elevation >= HORIZON ? "above_horizon" : "below_horizon",
    attributes: {
      friendly_name: "Sun",
      next_dawn: iso(events.nextDawn),
      next_dusk: iso(events.nextDusk),
      next_noon: iso(events.nextNoon),
      next_rising: iso(events.nextRising),
      next_setting: iso(events.nextSetting),
      elevation: Math.round(elevation * 100) / 100,
      azimuth: Math.round(azimuth * 100) / 100,
      rising: events.nextNoon !== undefined && events.nextSetting !== undefined && events.nextNoon < events.nextSetting,
    },
    last_changed: stamp,
    last_updated: stamp,
  };
}

/**
 * Storybook-only `sun` transport: the real store and mapper, answered locally, the sun where it is now at the demo
 * home and moved on each minute. Read-only.
 */
export function createDemoSunHaTransport(now: number = Date.now()): HaTransport {
  return createDemoTransport({
    seed: { "sun.sun": demoSun(now) },
    services: {},
    refuse: (domain, service) => new Error(`The sun is read-only: ${domain}.${service}`),
    tick: { ms: 60_000, change: () => { const next = demoSun(); return ["sun.sun", { state: next.state, attributes: next.attributes }]; } },
  });
}
