import { createDemoClimateHaTransport, createDemoHaTransport, createDemoSensorHaTransport, createDemoWeatherHaTransport, demoSendMessage } from "../demo";
import { createDemoAlarmHaTransport } from "./alarm";
import { createDemoCoverHaTransport } from "./cover";
import { createDemoHumidifierHaTransport } from "./humidifier";
import { createDemoOwletHaTransport } from "./owlet";
import { createDemoToggleHaTransport } from "./toggle";
import { createDemoSoundHaTransport } from "./sound";
import type { HaTransport, HassEntities } from "../types";

/**
 * Storybook-only: every domain's demo transport behind one transport, as one house. Entities are merged
 * into one map; each service call goes to the transport that owns its entity.
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
    sendMessage: (type, payload = {}) => demoSendMessage(merged(), type, payload),
  };
}
