/**
 * For tests of connected cards: a transport that serves entities and records service calls, and a render under a real
 * store and provider. Only tests import this.
 */
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { HaProvider } from "./ha/provider";
import { createHaStore } from "./ha/store";
import type { HaServiceCallOptions, HaTransport, HassEntity, HassEntities } from "./ha/types";

/** One recorded `callService` request, in the order the card made it. */
export interface FakeServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
  options?: HaServiceCallOptions;
}

/**
 * Serves the entity map on subscribe. `emit` pushes a whole map, `emitEntity` patches one entity (merging its
 * attributes), and `calls` records every service call the store made.
 */
export function fakeTransport(initialEntities: HassEntities) {
  let entities = initialEntities;
  let listener: ((next: HassEntities) => void) | undefined;
  const calls: FakeServiceCall[] = [];
  const callService = vi.fn<HaTransport["callService"]>(async (domain, service, serviceData = {}, options) => {
    calls.push({ domain, service, data: serviceData, ...(options === undefined ? {} : { options }) });
    return undefined;
  });
  const transport: HaTransport = {
    subscribeEntities(next) {
      listener = next;
      queueMicrotask(() => next(entities));
      return () => { listener = undefined; };
    },
    callService,
  };
  const publish = (next: HassEntities) => {
    entities = next;
    listener?.(entities);
  };
  return {
    transport,
    callService,
    calls,
    /** Publish a whole entity map, as a transport does after a change. */
    emit: publish,
    /** Patch one entity: top-level fields overwrite, `attributes` merge, everything else keeps its identity. */
    emitEntity(entityId: string, patch: Partial<HassEntity>) {
      const current = entities[entityId] ?? { entity_id: entityId, state: "unknown", attributes: {} };
      const next: HassEntity = {
        ...current,
        ...patch,
        entity_id: entityId,
        attributes: patch.attributes ? { ...current.attributes, ...patch.attributes } : current.attributes,
      };
      publish({ ...entities, [entityId]: next });
    },
  };
}

/** Render a connected card under a store on `fakeTransport(entities)`: what `render` returns, and the transport's handles. */
export function renderConnected(ui: ReactNode, entities: HassEntities) {
  const fake = fakeTransport(entities);
  return { ...render(<HaProvider store={createHaStore(fake.transport)}>{ui}</HaProvider>), ...fake };
}
