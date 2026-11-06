import type { HaServiceCallOptions, HaTransport, HassEntities, HassEntity } from "../ha/types";
import { demoSendMessage } from "./messages";
import type { DemoHistoryRow } from "./messages";

/** What a service does to the entity it targets: its next state, and the attributes it changes. */
export interface DemoChange {
  state?: string;
  attributes?: HassEntity["attributes"];
}

/** One service call, as a demo service sees it. */
export interface DemoCall {
  /** The entity the call targets, as it is now. */
  entity: HassEntity;
  /** The call's service data. */
  data: Record<string, unknown>;
  /** Change the entity again after `ms`, as a device that takes time to get there does (a lock's bolt). */
  later(change: DemoChange, ms: number): void;
  /** Change another of the transport's entities now, as a button that acts on its device's other entities does. */
  also(entityId: string, change: DemoChange): void;
}

/**
 * A demo service: the change it makes to the entity it targets, or `{ response }` for one that answers instead
 * (`weather.get_forecasts`). It throws what Home Assistant would refuse (bad data, a wrong code).
 */
export type DemoService = (call: DemoCall) => DemoChange | { response: unknown };

/** `domain.service` → what it does. */
export type DemoServices = Record<string, DemoService>;

export interface DemoTransportOptions {
  /** The entities it starts with; copied, so the seed is never changed. */
  seed: HassEntities;
  /** What it answers. Any other call is refused. */
  services: DemoServices;
  /** What a refused call says. Default: "Unsupported demo service: domain.service". */
  refuse?: (domain: string, service: string) => unknown;
  /** History rows for `history/history_during_period`, where the generic morning won't do. */
  history?: (entities: HassEntities, entityIds: readonly string[]) => Record<string, DemoHistoryRow[]>;
  /** A live reading: every `ms`, `change` picks an entity and its change, or nothing. It runs while anyone listens. */
  tick?: { ms: number; change: (entities: HassEntities) => [string, DemoChange] | undefined };
}

const copy = (entities: HassEntities): HassEntities =>
  Object.fromEntries(Object.entries(entities).map(([id, e]) => [id, { ...e, attributes: { ...e.attributes } }]));

/**
 * A demo transport: the same store and service path as a host transport, answered locally. It holds the entities,
 * delivers them to every subscriber now and after each change, routes a call to its service by `domain.service` and
 * its target (`entity_id`, or the call's `target`), and stamps the change as Home Assistant does: `last_updated` on
 * every change, `last_changed` when the state changes. Registries and history come from `demoSendMessage`. A
 * domain's transport is its seed and its services alone.
 */
export function createDemoTransport({ seed, services, refuse, history, tick }: DemoTransportOptions): HaTransport {
  let entities = copy(seed);
  const listeners = new Set<(next: HassEntities) => void>();
  let timer: ReturnType<typeof setInterval> | undefined;

  const apply = (entityId: string, { state, attributes }: DemoChange) => {
    const current = entities[entityId];
    if (!current) return;
    const now = new Date().toISOString();
    const next = state ?? current.state;
    entities = {
      ...entities,
      [entityId]: {
        ...current,
        state: next,
        attributes: { ...current.attributes, ...attributes },
        last_changed: next === current.state ? current.last_changed : now,
        last_updated: now,
      },
    };
    listeners.forEach((listener) => listener({ ...entities }));
  };

  const beat = () => {
    const change = tick?.change(entities);
    if (change) apply(...change);
  };

  return {
    subscribeEntities(listener) {
      listeners.add(listener);
      queueMicrotask(() => listener({ ...entities }));
      if (tick && tick.ms > 0 && !timer) timer = setInterval(beat, tick.ms);
      return () => {
        listeners.delete(listener);
        if (!listeners.size && timer) { clearInterval(timer); timer = undefined; }
      };
    },
    async callService(domain, service, data = {}, options: HaServiceCallOptions = {}) {
      const run = services[`${domain}.${service}`];
      if (!run) throw refuse ? refuse(domain, service) : new Error(`Unsupported demo service: ${domain}.${service}`);
      const entityId = data.entity_id ?? options.target?.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      const answer = run({ entity: entities[entityId], data, later: (change, ms) => setTimeout(() => apply(entityId, change), ms), also: apply });
      if ("response" in answer) return { response: answer.response };
      apply(entityId, answer);
      return { success: true };
    },
    sendMessage: async (type, payload = {}) => {
      if (history && type === "history/history_during_period") {
        const ids = payload.entity_ids;
        if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) throw new Error("Demo history entity_ids missing");
        return history(entities, ids);
      }
      return demoSendMessage(entities, type, payload);
    },
  };
}

/** Switching one domain's entities on and off: `toggle`, `turn_on` and `turn_off`, or the ones named. */
export function onOffServices(domain: string, only: Array<"toggle" | "turn_on" | "turn_off"> = ["toggle", "turn_on", "turn_off"]): DemoServices {
  const all: Record<string, DemoService> = {
    toggle: ({ entity }) => ({ state: entity.state === "on" ? "off" : "on" }),
    turn_on: () => ({ state: "on" }),
    turn_off: () => ({ state: "off" }),
  };
  return Object.fromEntries(only.map((service) => [`${domain}.${service}`, all[service]]));
}
