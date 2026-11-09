import { createDemoClimateHaTransport, createDemoHaTransport, createDemoSensorHaTransport, createDemoWeatherHaTransport } from "../demo";
import { demoSendMessage } from "./messages";
import { createDemoAlarmHaTransport } from "./alarm";
import { createDemoCoverHaTransport } from "./cover";
import { createDemoFanHaTransport } from "./fan";
import { createDemoHumidifierHaTransport } from "./humidifier";
import { createDemoOwletHaTransport } from "./owlet";
import { createDemoToggleHaTransport } from "./toggle";
import { createDemoSoundHaTransport } from "./sound";
import { createDemoLockHaTransport } from "./lock";
import { createDemoGuestWifiHaTransport } from "./guestWifi";
import { createDemoBinarySensorHaTransport } from "./binarySensor";
import { createDemoCameraHaTransport } from "./camera";
import { createDemoMediaPlayerHaTransport } from "./mediaPlayer";
import { createDemoNumericHaTransport } from "./numeric";
import { createDemoVacuumHaTransport } from "./vacuum";
import { createDemoCalendarHaTransport } from "./calendar";
import { createDemoSunHaTransport } from "./sun";
import { createDemoDysonHaTransport } from "./dyson";
// new-card: house imports
import type { HaTransport, HassEntities } from "../ha/types";

/**
 * Storybook-only: every domain's demo transport behind one transport, as one house. Entities are merged
 * into one map; each service call, and each entity's history, goes to the transport that owns its entity.
 */
export function createDemoHouseTransport(): HaTransport {
  const parts = [
    createDemoHaTransport(),
    createDemoClimateHaTransport(),
    createDemoSensorHaTransport(),
    createDemoWeatherHaTransport(),
    createDemoCoverHaTransport(),
    createDemoHumidifierHaTransport(),
    createDemoToggleHaTransport(),
    createDemoAlarmHaTransport(),
    createDemoOwletHaTransport(),
    createDemoSoundHaTransport(),
    createDemoLockHaTransport(),
    createDemoFanHaTransport(),
    createDemoGuestWifiHaTransport(),
    createDemoBinarySensorHaTransport(),
    createDemoCameraHaTransport(),
    createDemoMediaPlayerHaTransport(),
    createDemoNumericHaTransport(),
    createDemoVacuumHaTransport(),
    createDemoCalendarHaTransport(),
    createDemoSunHaTransport(),
    createDemoDysonHaTransport(),
    // new-card: house parts
  ];
  const latest: HassEntities[] = parts.map(() => ({}));
  const owner = new Map<string, HaTransport>();
  const merged = () => Object.assign({}, ...latest) as HassEntities;

  return {
    subscribeEntities(listener) {
      const stops = parts.map((part, i) => part.subscribeEntities((entities) => {
        latest[i] = entities;
        for (const id of Object.keys(entities)) owner.set(id, part);
        listener(merged());
      }));
      return () => stops.forEach((stop) => stop());
    },
    callService(domain, service, serviceData = {}, options = {}) {
      const target = serviceData.entity_id ?? options.target?.entity_id;
      const part = typeof target === "string" ? owner.get(target) : undefined;
      if (!part) return Promise.reject(new Error("Demo entity not found"));
      return part.callService(domain, service, serviceData, options);
    },
    async sendMessage(type, payload = {}) {
      if (type !== "history/history_during_period") return demoSendMessage(merged(), type, payload);
      // A history read goes to the part that owns each entity, so a part's own day (the numeric demo's morning, the
      // sensor's) answers for it, never the generic one; their answers are merged, and an entity no part holds is left
      // out, as Home Assistant leaves out one with no history.
      const ids = payload.entity_ids;
      if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) throw new Error("Demo history entity_ids missing");
      const asked = new Map<HaTransport, string[]>();
      for (const id of ids) {
        const part = owner.get(id);
        if (part) asked.set(part, [...(asked.get(part) ?? []), id]);
      }
      const answers = await Promise.all([...asked].map(([part, entityIds]) => part.sendMessage!(type, { ...payload, entity_ids: entityIds })));
      return Object.assign({}, ...answers) as unknown;
    },
    // The first part that holds the picture serves it; none fetches the network.
    resolveUrl: (path) => parts.reduce<string | undefined>((found, part) => found ?? part.resolveUrl?.(path), undefined),
  };
}
