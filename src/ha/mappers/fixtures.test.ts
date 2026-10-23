import { describe, expect, it } from "vitest";
import type { HassEntities, HassEntity } from "../types";
import alarm from "../fixtures/alarm.json";
import climate from "../fixtures/climate.json";
import cover from "../fixtures/cover.json";
import light from "../fixtures/light.json";
import sensor from "../fixtures/sensor.json";
import toggle from "../fixtures/toggle.json";
import weather from "../fixtures/weather.json";
import owlet from "../fixtures/owlet.json";
import { alarmFromHass } from "./alarm";
import { climateFromHass } from "./climate";
import { coverFromHass } from "./cover";
import { lightFromHass } from "./light";
import { sensorFromHass } from "./sensor";
import { toggleFromHass } from "./toggle";
import { weatherFromHass } from "./weather";
import { owletFromHass } from "./owlet";

type Mapper = (raw: HassEntity, entityId: string) => { entityId: string; name: string; state: string };

/** Raw-state fixtures per domain, run through the real mapper. `keepsState`: the model reuses HA's state string. */
const domains: Array<{ domain: string; fixture: HassEntities; map: Mapper; keepsState: boolean }> = [
  { domain: "light", fixture: light, map: lightFromHass, keepsState: true },
  { domain: "climate", fixture: climate, map: climateFromHass, keepsState: true },
  { domain: "sensor", fixture: sensor, map: sensorFromHass, keepsState: false },
  { domain: "weather", fixture: weather, map: weatherFromHass, keepsState: true },
  { domain: "cover", fixture: cover, map: coverFromHass, keepsState: true },
  { domain: "toggle", fixture: toggle, map: toggleFromHass, keepsState: true },
  { domain: "alarm_control_panel", fixture: alarm, map: alarmFromHass, keepsState: true },
  { domain: "owlet sleep state", fixture: owlet, map: owletFromHass, keepsState: true },
];

describe.each(domains)("$domain fixture", ({ fixture, map, keepsState }) => {
  const entries = Object.entries(fixture);

  it("covers the unknown and unavailable states", () => {
    const states = entries.map(([, raw]) => raw.state);
    expect(states).toContain("unknown");
    expect(states).toContain("unavailable");
  });

  it.each(entries)("maps %s", (entityId, raw) => {
    expect(raw.entity_id).toBe(entityId);
    const mapped = map(raw, entityId);
    expect(mapped.entityId).toBe(entityId);
    expect(mapped.name.length).toBeGreaterThan(0);
    if (raw.state === "unknown" || raw.state === "unavailable") {
      expect(mapped.state).toBe("unavailable");
    } else if (keepsState) {
      expect(mapped.state).toBe(raw.state);
    } else {
      expect(mapped.state).not.toBe("unavailable");
    }
  });
});
