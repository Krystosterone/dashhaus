import type { OwletEntity } from "../../widgets/owlet/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";

export interface OwletHandlers {
  onBaseToggle?: () => void;
}

export interface OwletHandlerOptions {
  onError?: (error: HaActionError) => void;
  /** The base station's `switch.*`; without it there is nothing to switch. */
  baseEntityId?: string;
}

/**
 * Create safe callback handlers for the OwletTile contract: the base station's switch, and nothing else (the
 * sock's readings are read-only). It sends `switch.turn_on` or `switch.turn_off` for the state the card shows,
 * never `toggle`: a repeated tap on a stale card then repeats the same request instead of undoing it.
 */
export function createOwletHandlers(caller: Pick<HaStore, "callService">, entity: OwletEntity, options: OwletHandlerOptions = {}): OwletHandlers {
  const { baseEntityId } = options;
  if (!baseEntityId || entity.baseOn == null) return {};
  const { run } = serviceRunner(caller, "switch", { entityId: baseEntityId, state: entity.baseOn ? "on" : "off" }, options.onError);
  return { onBaseToggle: () => run(entity.baseOn ? "turn_off" : "turn_on") };
}
