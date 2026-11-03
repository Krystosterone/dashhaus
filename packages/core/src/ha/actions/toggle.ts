import type { ToggleEntity } from "../../entities/toggle/types";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";
import type { ActionKinds } from "./kinds";

type ToggleServiceCaller = Pick<HaStore, "callService">;

/** The native Home Assistant domain an input_boolean or switch entity belongs to. */
export type ToggleDomain = "input_boolean" | "switch";

const DOMAINS: readonly string[] = ["input_boolean", "switch"] satisfies ToggleDomain[];

export interface ToggleHandlers {
  onToggle: () => void;
}

/** What each handler is, for a card drawing toggle without knowing it (`ActionKind`). */
export const TOGGLE_ACTIONS = {
  onToggle: { takes: "nothing" },
} as const satisfies ActionKinds<ToggleHandlers>;

export interface ToggleHandlerOptions {
  onError?: (error: HaActionError) => void;
}

/**
 * Create safe callback handlers for the existing ToggleTile contract. The service is the same (`toggle`) on both
 * domains; the entity id's own domain picks which one is called.
 *
 * Native Home Assistant has no timed-on ("turn on for N minutes") service for input_boolean or switch:
 * both only expose `toggle`. The card's durations feature is a host-side timer hook, so `onTurnOnFor`
 * is intentionally absent here and stays host-owned.
 */
export function createToggleHandlers(caller: ToggleServiceCaller, entity: ToggleEntity, options: ToggleHandlerOptions = {}): ToggleHandlers {
  const domain = entity.entityId.slice(0, entity.entityId.indexOf("."));
  const { run, unsupported } = serviceRunner(caller, domain, entity, options.onError);

  return {
    onToggle: () => {
      if (!DOMAINS.includes(domain)) {
        unsupported(`${entity.entityId} is not an input_boolean or a switch`);
        return;
      }
      if (entity.state === "unavailable") {
        unsupported(`${entity.entityId} is unavailable`);
        return;
      }
      run("toggle");
    },
  };
}
