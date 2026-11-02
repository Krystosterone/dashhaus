import { HaActionError } from "../types";
import type { HaStore } from "../types";

export type ServiceCaller = Pick<HaStore, "callService">;

/**
 * What every action module needs for one entity: run a service on its domain, and report an action
 * that Home Assistant rejected or that never reached it. Rejections keep a provider `HaActionError`
 * and replace anything else with a sanitized one, so no raw provider error escapes.
 */
export function serviceRunner(caller: ServiceCaller, domain: string, entity: { entityId: string; state: string }, onError?: (error: HaActionError) => void) {
  const { entityId } = entity;
  const unsupported = (message: string) => onError?.(new HaActionError("unsupported", message, { domain, entityId }));
  const sanitized = (service: string, cause: unknown) => (
    cause instanceof HaActionError ? cause : new HaActionError("service_failed", `Home Assistant rejected ${domain}.${service}`, { domain, service, entityId })
  );
  return {
    run(service: string, data: Record<string, unknown> = {}) {
      void caller.callService(domain, service, { entity_id: entityId, ...data }).catch((cause) => {
        onError?.(sanitized(service, cause));
      });
    },
    /**
     * Run a service and answer when Home Assistant has: nothing once it took it, else the sanitized error. Never
     * rejects, and reports nothing itself, so the caller decides which answers are errors (a wrong code isn't).
     */
    async attempt(service: string, data: Record<string, unknown> = {}): Promise<HaActionError | undefined> {
      try {
        await caller.callService(domain, service, { entity_id: entityId, ...data });
        return undefined;
      } catch (cause) {
        return sanitized(service, cause);
      }
    },
    /** Report an error `attempt` answered. */
    report: (error: HaActionError) => onError?.(error),
    unsupported,
    invalidInput: (message: string) => onError?.(new HaActionError("invalid_input", message, { domain, entityId })),
    /** False, reported as unsupported, while the entity is unavailable. */
    actionable() {
      if (entity.state !== "unavailable") return true;
      unsupported(`${entityId} is unavailable`);
      return false;
    },
  };
}
