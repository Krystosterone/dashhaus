import { describe, expect, it } from "vitest";
import type { HassEntities, HassEntity } from "../types";
import lock from "../fixtures/lock.json";
import fan from "../fixtures/fan.json";
import guestWifi from "../fixtures/guestWifi.json";
import binarySensor from "../fixtures/binarySensor.json";
import camera from "../fixtures/camera.json";
import mediaPlayer from "../fixtures/mediaPlayer.json";
import numeric from "../fixtures/numeric.json";
import vacuum from "../fixtures/vacuum.json";
import calendar from "../fixtures/calendar.json";
import sun from "../fixtures/sun.json";
// new-card: fixture imports
import alarm from "../fixtures/alarm.json";
import climate from "../fixtures/climate.json";
import cover from "../fixtures/cover.json";
import light from "../fixtures/light.json";
import sensor from "../fixtures/sensor.json";
import toggle from "../fixtures/toggle.json";
import weather from "../fixtures/weather.json";
import owlet from "../fixtures/owlet.json";
import humidifier from "../fixtures/humidifier.json";
import sound from "../fixtures/sound.json";
import { lockFromHass } from "./lock";
import { fanFromHass } from "./fan";
import { guestWifiFromHass } from "./guestWifi";
import { binarySensorFromHass } from "./binarySensor";
import { cameraFromHass } from "./camera";
import { mediaPlayerFromHass } from "./mediaPlayer";
import { numericFromHass } from "./numeric";
import { vacuumFromHass } from "./vacuum";
import { calendarFromHass } from "./calendar";
import { sunFromHass } from "./sun";
// new-card: mapper imports
import { alarmFromHass } from "./alarm";
import { climateFromHass } from "./climate";
import { coverFromHass } from "./cover";
import { lightFromHass } from "./light";
import { sensorFromHass } from "./sensor";
import { toggleFromHass } from "./toggle";
import { weatherFromHass } from "./weather";
import { owletFromHass } from "./owlet";
import { humidifierFromHass } from "./humidifier";
import { soundFromHass } from "./sound";

type Mapper = (raw: HassEntity, entityId: string) => { entityId: string; name: string; state: string };

/**
 * Raw-state fixtures per domain, run through the real mapper. `keepsState`: the model reuses HA's state string.
 * `keepsUnknown`: `unknown` stays its own state, one the card can still drive; elsewhere it is unavailable.
 */
const domains: Array<{ domain: string; fixture: HassEntities; map: Mapper; keepsState: boolean; keepsUnknown?: boolean }> = [
  { domain: "light", fixture: light, map: lightFromHass, keepsState: true, keepsUnknown: true },
  { domain: "climate", fixture: climate, map: climateFromHass, keepsState: true },
  { domain: "sensor", fixture: sensor, map: sensorFromHass, keepsState: false },
  { domain: "weather", fixture: weather, map: weatherFromHass, keepsState: true },
  { domain: "cover", fixture: cover, map: coverFromHass, keepsState: true, keepsUnknown: true },
  { domain: "toggle", fixture: toggle, map: toggleFromHass, keepsState: true },
  { domain: "alarm_control_panel", fixture: alarm, map: alarmFromHass, keepsState: true },
  { domain: "owlet sleep state", fixture: owlet, map: owletFromHass, keepsState: true },
  { domain: "humidifier", fixture: humidifier, map: humidifierFromHass, keepsState: true },
  { domain: "sound", fixture: sound, map: soundFromHass, keepsState: true },
  { domain: "lock", fixture: lock, map: lockFromHass, keepsState: true },
  { domain: "fan", fixture: fan, map: fanFromHass, keepsState: true },
  { domain: "guest wifi", fixture: guestWifi, map: guestWifiFromHass, keepsState: false },
  { domain: "binary sensor", fixture: binarySensor, map: binarySensorFromHass, keepsState: true },
  { domain: "camera", fixture: camera, map: cameraFromHass, keepsState: true },
  { domain: "media player", fixture: mediaPlayer, map: mediaPlayerFromHass, keepsState: true },
  { domain: "numeric", fixture: numeric, map: numericFromHass, keepsState: false },
  { domain: "vacuum", fixture: vacuum, map: vacuumFromHass, keepsState: true },
  { domain: "calendar", fixture: calendar, map: calendarFromHass, keepsState: false },
  { domain: "sun", fixture: sun, map: sunFromHass, keepsState: false },
  // new-card: fixtures
];

describe.each(domains)("$domain fixture", ({ fixture, map, keepsState, keepsUnknown }) => {
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
    if (raw.state === "unknown" && keepsUnknown) {
      expect(mapped.state).toBe("unknown");
    } else if (raw.state === "unknown" || raw.state === "unavailable") {
      expect(mapped.state).toBe("unavailable");
    } else if (keepsState) {
      expect(mapped.state).toBe(raw.state);
    } else {
      expect(mapped.state).not.toBe("unavailable");
    }
  });
});
