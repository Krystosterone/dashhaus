import type { __Name__Entity } from "../../entities/__name__/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";

export interface __Name__Handlers {
  onToggle: () => void;
}

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
