import type { __Name__Entity } from "../../entities/__name__/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

export interface __Name__Handlers {
  onToggle: () => void;
}

/**
 * What each handler is, for a card drawing __name__ without knowing it (`ActionKind`): a tap, a code, or a value; and
 * whether it asks first. Declare every handler you add here, so no generated card makes a deliberate action one tap.
 */
export const __CONST___ACTIONS = {
  onToggle: { takes: "nothing" },
} as const satisfies ActionKinds<__Name__Handlers>;

export interface __Name__HandlerOptions {
  onError?: (error: HaActionError) => void;
}

/**
 * Create safe callback handlers for the __Name__Tile contract. Each handler builds one native
 * `__domain__.*` service call; gate what the entity can't do and report it rather than sending it.
 */
export function create__Name__Handlers(caller: Pick<HaStore, "callService">, entity: __Name__Entity, options: __Name__HandlerOptions = {}): __Name__Handlers {
  const { run, actionable } = serviceRunner(caller, "__domain__", entity, options.onError);
  return {
    onToggle: () => {
      if (actionable()) run("toggle");
    },
  };
}
