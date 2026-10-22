import type { ToggleEntity } from "../../widgets/toggle/types";
import { HaActionError } from "../types";
import type { HaStore } from "../types";

type ToggleServiceCaller = Pick<HaStore, "callService">;

/** The native Home Assistant domain an input_boolean or switch entity belongs to. */
export type ToggleDomain = "input_boolean" | "switch";

export interface ToggleHandlers {
  onToggle: () => void;
}

export interface ToggleHandlerOptions {
  onError?: (error: HaActionError) => void;
  /**
   * Required: the native domain ("input_boolean" | "switch"). The service name is the same (`toggle`)
   * but the domain differs per entity type, and ToggleEntity carries no domain field.
   */
  domain: ToggleDomain;
}

/**
 * Create safe callback handlers for the existing ToggleTile contract.
 *
 * Native Home Assistant has no timed-on ("turn on for N minutes") service for input_boolean or switch:
 * both only expose `toggle`. The widget's durations feature is a host-side timer hook, so `onTurnOnFor`
 * is intentionally absent here and stays host-owned.
 */
export function createToggleHandlers(caller: ToggleServiceCaller, entity: ToggleEntity, options: ToggleHandlerOptions): ToggleHandlers {
  const { domain } = options;
  const run = (service: string, data: Record<string, unknown> = {}) => {
    void caller.callService(domain, service, { entity_id: entity.entityId, ...data }).catch((cause) => {
      const error = cause instanceof HaActionError ? cause : new HaActionError("service_failed", `Home Assistant rejected ${domain}.${service}`, {
        domain,
        service,
        entityId: entity.entityId,
      });
      options.onError?.(error);
    });
  };
  const unsupported = (message: string) => options.onError?.(new HaActionError("unsupported", message, { domain, entityId: entity.entityId }));

  return {
    onToggle: () => {
      if (entity.state === "unavailable") {
        unsupported(`${entity.entityId} is unavailable`);
        return;
      }
      run("toggle");
    },
  };
}
