/**
 * For tests of connected cards: a transport that serves entities and records service calls, and a render under a real
 * store and provider. Only tests import this.
 */
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { HaProvider } from "./ha/provider";
import { createHaStore } from "./ha/store";
import type { HaTransport, HassEntities } from "./ha/types";

/** Serves `entities` on subscribe; `emit` pushes the next set, `callService` records every call. */
export function fakeTransport(entities: HassEntities) {
  let listener: ((next: HassEntities) => void) | undefined;
  const callService = vi.fn(async () => undefined);
  const transport: HaTransport = {
    subscribeEntities(next) {
      listener = next;
      queueMicrotask(() => next(entities));
      return () => { listener = undefined; };
    },
    callService,
  };
  return { transport, callService, emit: (next: HassEntities) => listener?.(next) };
}

/** Render a connected card under a store on `fakeTransport(entities)`: what `render` returns, and the transport's handles. */
export function renderConnected(ui: ReactNode, entities: HassEntities) {
  const fake = fakeTransport(entities);
  return { ...render(<HaProvider store={createHaStore(fake.transport)}>{ui}</HaProvider>), ...fake };
}
