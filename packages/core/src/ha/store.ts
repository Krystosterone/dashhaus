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
import { perfEnabled, perfMark, perfMarkAfterPaint } from "../perf";

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
 *
 * `initialEntities` is a complete snapshot the host already has, such as Home Assistant's `hass.states`.
 * With it, the store is connected from the first frame instead of waiting for its own subscription's
 * snapshot; the subscription still replaces it with the live snapshot when that arrives. A reconnect
 * has no seed and waits for the next snapshot, as before.
 */
export function createHaStore(transport: HaTransport, initialEntities?: HassEntities): HaStore {
  const listeners = new Set<() => void>();
  let snapshot: HaSnapshot = { status: "idle", entities: {}, generation: 0 };
  let seed = initialEntities && Object.keys(initialEntities).length > 0 ? initialEntities : undefined;
  let session = 0;
  const stops: Unsubscribe[] = [];
  let attempt: { promise: Promise<void>; resolve: () => void; reject: (error: unknown) => void } | undefined;
  let actionSequence = 0;
  let failedAction: (() => Promise<unknown>) | undefined;
  /** The action waiting for its entity update, only while performance marks are on. */
  let tracedAction: { seq: number; entityId?: string } | undefined;

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
    tracedAction = undefined;
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
    perfMark("store:error", { generation: snapshot.generation });
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
    // The host's snapshot is good for this connect attempt only; a reconnect waits for the live one.
    const initial = seed;
    seed = undefined;
    set({ status: "connecting", entities: initial ?? {}, error: undefined, lastActionError: undefined, generation: snapshot.generation + 1 });
    const onEntities = (entities: HassEntities) => {
      if (owner !== session) return;
      const traced = tracedAction;
      if (traced?.entityId) {
        const before = snapshot.entities[traced.entityId];
        const after = entities[traced.entityId];
        if (after && (!before || before.state !== after.state || before.last_updated !== after.last_updated)) {
          tracedAction = undefined;
          perfMark("action:state", { seq: traced.seq, state: after.state });
          perfMarkAfterPaint("action:settled", { seq: traced.seq });
        }
      }
      if (snapshot.status === "connected") {
        set({ entities });
        return;
      }
      set({ status: "connected", entities, error: undefined, generation: snapshot.generation + 1 });
      perfMark("store:connected", { generation: snapshot.generation });
      // The cards draw from this snapshot; the first frame after it is the dashboard with data, not its placeholders.
      perfMarkAfterPaint("store:painted", { generation: snapshot.generation });
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
        perfMark("store:disconnected", { generation: snapshot.generation });
      } else if (snapshot.status !== "connected") {
        // Ready again; the transport resubscribes and the next entity snapshot marks the store connected.
        set({ status: "connecting", generation: snapshot.generation + 1 });
      }
    };

    try {
      if (transport.subscribeConnection) stops.push(transport.subscribeConnection(onConnection));
      stops.push(transport.subscribeEntities(onEntities));
      // The subscription is in place; the host's snapshot is the first complete one, so there is nothing
      // to wait for before the cards may draw and act. A synchronous first snapshot already did this.
      if (initial && owner === session && snapshot.status === "connecting") {
        set({ status: "connected", entities: initial, error: undefined, generation: snapshot.generation + 1 });
        perfMark("store:connected", { generation: snapshot.generation, seeded: true });
        perfMarkAfterPaint("store:painted", { generation: snapshot.generation, seeded: true });
        settle();
      }
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
    perfMark("store:disconnected", { generation: snapshot.generation });
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
    const tracing = action && perfEnabled();
    const report = (error: HaActionError) => {
      if (tracing) {
        perfMark("action:error", { seq: actionId, code: error.code });
        if (tracedAction?.seq === actionId) tracedAction = undefined;
      }
      if (action && actionId === actionSequence && generation === snapshot.generation) {
        failedAction = retry && error.retryable ? retry : undefined;
        set({ lastActionError: error });
      }
      return error;
    };
    if (snapshot.status !== "connected") {
      throw report(new HaActionError("not_connected", "Home Assistant is not connected", details));
    }
    if (tracing) {
      if (tracedAction) perfMark("action:superseded", { seq: tracedAction.seq });
      tracedAction = { seq: actionId, entityId: details.entityId };
      perfMark("action:start", { seq: actionId, label, entityId: details.entityId });
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
    if (tracing) perfMark("action:ack", { seq: actionId, label });
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
