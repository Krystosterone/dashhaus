import { createHaStore } from "../ha/store";
import type { HaStore, HaTransport } from "../ha/types";
import { createDemoHouseTransport } from "./house";

/**
 * One-line demo store for Storybook and tests: the whole demo house behind a real store, or a focused demo transport
 * when a story needs one domain. The caller still renders `HaProvider` around its cards and owns the store's life.
 *
 * ```tsx
 * const store = createDemoStore();
 * <HaProvider store={store}><MyDashboard /></HaProvider>
 * ```
 */
export function createDemoStore(transport: HaTransport = createDemoHouseTransport()): HaStore {
  return createHaStore(transport);
}
