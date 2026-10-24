import { HaActionError } from "./types";
import type {
  HaServiceCallOptions,
  HaSnapshot,
  HaStore,
  HaTransport,
  HaTransportConnectionStatus,
  HassEntities,
  Unsubscribe,
} from "./types";
import { isRecord, safeProperty } from "./util";

/** `home-assistant-js-websocket`'s ERR_CONNECTION_LOST: in-flight commands are rejected with it when the socket drops. */
const ERR_CONNECTION_LOST = 3;

type ErrorDetails = { domain?: string; service?: string; entityId?: string };

/**
 * Create one shared raw-entity store for one Home Assistant transport.
 *
 * The transport owns the socket: it keeps the entity subscription alive across its own reconnects and
 * reports loss and recovery through `subscribeConnection`. The store fans snapshots out to React, clears
 * stale entities while the connection is down, and advances `generation` on every loss and recovery so
 * reads and actions started under an older connection are reported as having an unknown outcome.
 */
export function createHaStore(transport: HaTransport): HaStore {
  const listeners = new Set<() => void>();
  let snapshot: HaSnapshot = { status: "idle", entities: {}, generation: 0 };
  let session = 0;
  const stops: Unsubscribe[] = [];
  let attempt: { promise: Promise<void>; resolve: () => void; reject: (error: unknown) => void } | undefined;
  let actionSequence = 0;
  let failedAction: (() => Promise<unknown>) | undefined;

  const set = (patch: Partial<HaSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A consumer callback must not prevent the remaining subscribers from seeing state.
      }
    }
  };

  const settle = (error?: unknown) => {
    const current = attempt;
    attempt = undefined;
    if (!current) return;
    if (error === undefined) current.resolve();
    else current.reject(error);
  };

  const teardown = () => {
    session += 1;
    for (const stop of stops.splice(0)) {
      try {
        stop();
      } catch {
        // The subscription is abandoned either way.
      }
    }
  };

  const fail = () => {
    teardown();
    failedAction = undefined;
    set({ status: "error", entities: {}, error: lifecycleError(), lastActionError: undefined, generation: snapshot.generation + 1 });
    settle(lifecycleError());
  };

  const connect = () => {
    if (attempt) return attempt.promise;
    if (snapshot.status === "connected") return Promise.resolve();
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
    attempt = { promise, resolve, reject };
    teardown();
    failedAction = undefined;
    const owner = session;
    set({ status: "connecting", entities: {}, error: undefined, lastActionError: undefined, generation: snapshot.generation + 1 });
    const onEntities = (entities: HassEntities) => {
      if (owner !== session) return;
      if (snapshot.status === "connected") {
        set({ entities });
        return;
      }
      set({ status: "connected", entities, error: undefined, generation: snapshot.generation + 1 });
      settle();
    };
    const onConnection = (status: HaTransportConnectionStatus) => {
      if (owner !== session) return;
      if (status === "error") {
        fail();
      } else if (status === "disconnected") {
        if (snapshot.status === "disconnected") return;
        failedAction = undefined;
        set({ status: "disconnected", entities: {}, lastActionError: undefined, generation: snapshot.generation + 1 });
      } else if (snapshot.status !== "connected") {
        // Ready again; the transport resubscribes and the next entity snapshot marks the store connected.
        set({ status: "connecting", generation: snapshot.generation + 1 });
      }
    };

    try {
      if (transport.subscribeConnection) stops.push(transport.subscribeConnection(onConnection));
      stops.push(transport.subscribeEntities(onEntities));
    } catch {
      if (owner === session) fail();
    }
    return promise;
  };

  const disconnect = () => {
    teardown();
    settle();
    if (snapshot.status === "disconnected" || snapshot.status === "idle") return;
    failedAction = undefined;
    set({ status: "disconnected", entities: {}, error: undefined, lastActionError: undefined, generation: snapshot.generation + 1 });
  };

  /**
   * Run one request against the connected transport. A request that fails or settles after the
   * connection changed has an unknown outcome; only service calls own `lastActionError`.
   */
  const request = async (
    label: string,
    details: ErrorDetails,
    call: () => Promise<unknown>,
    action: boolean,
    retry?: () => Promise<unknown>,
  ) => {
    const generation = snapshot.generation;
    const actionId = action ? ++actionSequence : 0;
    const report = (error: HaActionError) => {
      if (action && actionId === actionSequence && generation === snapshot.generation) {
        failedAction = retry && (error.code === "service_failed" || error.code === "not_connected") ? retry : undefined;
        set({ lastActionError: error });
      }
      return error;
    };
    if (snapshot.status !== "connected") {
      throw report(new HaActionError("not_connected", "Home Assistant is not connected", details));
    }
    let result: unknown;
    try {
      result = await call();
    } catch (cause) {
      const lost = generation !== snapshot.generation || cause === ERR_CONNECTION_LOST || safeProperty(cause, "code") === ERR_CONNECTION_LOST;
      throw report(new HaActionError(
        lost ? "transport_unknown" : "service_failed",
        lost ? `Home Assistant connection lost during ${label}; outcome is unknown` : `Home Assistant rejected ${label}`,
        { ...details, ...providerDetails(cause) },
      ));
    }
    if (generation !== snapshot.generation) {
      throw report(new HaActionError("transport_unknown", `Home Assistant connection changed during ${label}; outcome is unknown`, details));
    }
    if (action && actionId === actionSequence) {
      failedAction = undefined;
      if (snapshot.lastActionError) set({ lastActionError: undefined });
    }
    return result;
  };

  const service = (action: boolean) => (
    domain: string,
    serviceName: string,
    serviceData: Record<string, unknown> = {},
    options: HaServiceCallOptions = {},
  ) => {
    if (!isRecord(serviceData) || !isServiceOptions(options)) {
      const error = new HaActionError("invalid_input", "Invalid Home Assistant service input", { domain, service: serviceName });
      if (action) {
        failedAction = undefined;
        set({ lastActionError: error });
      }
      return Promise.reject(error);
    }
    const details = { domain, service: serviceName, entityId: entityIdOf(serviceData, options) };
    const call = () => Object.keys(options).length > 0
      ? transport.callService(domain, serviceName, serviceData, options)
      : transport.callService(domain, serviceName, serviceData);
    let retry: (() => Promise<unknown>) | undefined;
    const execute = () => request(`${domain}.${serviceName}`, details, call, action, retry);
    if (action && !Object.prototype.hasOwnProperty.call(serviceData, "code")) retry = execute;
    return execute();
  };

  const callApi = (type: string, payload: Record<string, unknown> = {}) => {
    if (typeof type !== "string" || !isRecord(payload)) {
      return Promise.reject(new HaActionError("invalid_input", "Invalid Home Assistant command input"));
    }
    const sendMessage = transport.sendMessage;
    if (!sendMessage) {
      return Promise.reject(new HaActionError("unsupported", "Home Assistant transport does not support generic commands", { service: type }));
    }
    return request(type, { service: type }, () => sendMessage(type, payload), false);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    connect,
    disconnect,
    callService: service(true),
    clearActionError() {
      failedAction = undefined;
      if (snapshot.lastActionError) set({ lastActionError: undefined });
    },
    canRetryLastAction: () => snapshot.status === "connected" && failedAction !== undefined,
    retryLastAction() {
      return failedAction
        ? failedAction()
        : Promise.reject(new HaActionError("unsupported", "No Home Assistant action is available to retry"));
    },
    query: service(false),
    callApi,
  };
}

function lifecycleError() {
  return new Error("Home Assistant connection failed");
}

/** Keep only the provider's string scalars; never its message or payload, which can echo an alarm code. */
function providerDetails(cause: unknown) {
  const translationKey = safeProperty(cause, "translation_key");
  const providerCode = safeProperty(cause, "code");
  return {
    ...(typeof translationKey === "string" ? { translationKey } : {}),
    ...(typeof providerCode === "string" ? { providerCode } : {}),
  };
}

const TARGET_KEYS = new Set(["entity_id", "device_id", "area_id", "floor_id", "label_id"]);

function isServiceOptions(value: unknown): value is HaServiceCallOptions {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((key) => key !== "target" && key !== "returnResponse")) return false;
  if (value.returnResponse !== undefined && typeof value.returnResponse !== "boolean") return false;
  if (value.target === undefined) return true;
  if (!isRecord(value.target)) return false;
  return Object.entries(value.target).every(([key, target]) => (
    TARGET_KEYS.has(key)
    && (typeof target === "string" || Array.isArray(target) && target.every((item) => typeof item === "string"))
  ));
}

function entityIdOf(data: Record<string, unknown>, options: HaServiceCallOptions) {
  if (typeof data.entity_id === "string") return data.entity_id;
  return typeof options.target?.entity_id === "string" ? options.target.entity_id : undefined;
}
