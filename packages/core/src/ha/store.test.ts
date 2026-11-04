import { describe, expect, it, vi } from "vitest";
import { createHaStore } from "./store";
import { HaActionError } from "./types";
import type { ConnectionStatusListener, EntityListener, HaTransport, HassEntities } from "./types";

const entities: HassEntities = {
  "light.one": { entity_id: "light.one", state: "on", attributes: { brightness: 128 } },
};

/** A controllable transport: emit entities and connection events by hand. */
function fakeTransport(overrides: Partial<HaTransport> = {}) {
  const entityListeners: EntityListener[] = [];
  const connectionListeners: ConnectionStatusListener[] = [];
  const stopEntities = vi.fn();
  const stopConnection = vi.fn();
  const transport: HaTransport = {
    subscribeEntities: vi.fn((listener: EntityListener) => {
      entityListeners.push(listener);
      return stopEntities;
    }),
    subscribeConnection: vi.fn((listener: ConnectionStatusListener) => {
      connectionListeners.push(listener);
      return stopConnection;
    }),
    callService: vi.fn(async () => ({ ok: true })),
    sendMessage: vi.fn(async () => ["registry"]),
    ...overrides,
  };
  return {
    transport,
    stopEntities,
    stopConnection,
    emit: (next: HassEntities = entities) => entityListeners.at(-1)?.(next),
    status: (status: Parameters<ConnectionStatusListener>[0]) => connectionListeners.at(-1)?.(status),
  };
}

async function connected(overrides: Partial<HaTransport> = {}) {
  const fake = fakeTransport(overrides);
  const store = createHaStore(fake.transport);
  const connecting = store.connect();
  fake.emit();
  await connecting;
  return { ...fake, store };
}

describe("createHaStore lifecycle", () => {
  it("starts idle, connects on the first entity snapshot, and publishes it as is", async () => {
    const fake = fakeTransport();
    const store = createHaStore(fake.transport);
    expect(store.getSnapshot()).toMatchObject({ status: "idle", entities: {}, generation: 0 });

    const connecting = store.connect();
    expect(store.getSnapshot().status).toBe("connecting");
    fake.emit();
    await connecting;

    expect(store.getSnapshot().status).toBe("connected");
    expect(store.getSnapshot().entities).toBe(entities);
  });

  it("starts connected from a host snapshot and still takes the live one", async () => {
    const fake = fakeTransport();
    const store = createHaStore(fake.transport, entities);

    const connecting = store.connect();
    await expect(connecting).resolves.toBeUndefined();
    expect(store.getSnapshot()).toMatchObject({ status: "connected", entities });

    const live = { "light.one": { entity_id: "light.one", state: "off", attributes: {} } };
    fake.emit(live);
    expect(store.getSnapshot()).toMatchObject({ status: "connected", entities: live });
  });

  it("waits for its subscription when the host snapshot is empty", () => {
    const fake = fakeTransport();
    const store = createHaStore(fake.transport, {});

    void store.connect();
    expect(store.getSnapshot()).toMatchObject({ status: "connecting", entities: {} });
  });

  it("uses the host snapshot for the first connect only", async () => {
    const fake = fakeTransport();
    const store = createHaStore(fake.transport, entities);
    await store.connect();
    store.disconnect();

    const again = store.connect();
    expect(store.getSnapshot().status).toBe("connecting");
    fake.emit();
    await again;
    expect(store.getSnapshot()).toMatchObject({ status: "connected", entities });
  });

  it("shares one connect between concurrent callers and subscribes once", async () => {
    const fake = fakeTransport();
    const store = createHaStore(fake.transport);

    const first = store.connect();
    const second = store.connect();
    expect(second).toBe(first);
    fake.emit();
    await first;
    await store.connect();

    expect(fake.transport.subscribeEntities).toHaveBeenCalledTimes(1);
    expect(fake.transport.subscribeConnection).toHaveBeenCalledTimes(1);
  });

  it("isolates subscriber callback failures", async () => {
    const fake = fakeTransport();
    const store = createHaStore(fake.transport);
    const after = vi.fn();
    store.subscribe(() => { throw new Error("consumer bug"); });
    store.subscribe(after);

    const connecting = store.connect();
    fake.emit();
    await connecting;

    expect(after).toHaveBeenCalled();
  });

  it("clears entities and advances the generation on loss, then waits for the next snapshot after recovery", async () => {
    const { store, emit, status } = await connected();
    const before = store.getSnapshot().generation;

    status("disconnected");
    expect(store.getSnapshot()).toMatchObject({ status: "disconnected", entities: {}, generation: before + 1 });

    status("connected");
    expect(store.getSnapshot()).toMatchObject({ status: "connecting", entities: {}, generation: before + 2 });

    emit();
    expect(store.getSnapshot()).toMatchObject({ status: "connected", entities, generation: before + 3 });
  });

  it("does not resubscribe on recovery; the transport owns resubscription", async () => {
    const { store, transport, emit, status } = await connected();
    status("disconnected");
    status("connected");
    emit();

    expect(store.getSnapshot().status).toBe("connected");
    expect(transport.subscribeEntities).toHaveBeenCalledTimes(1);
  });

  it("fails closed on a terminal transport error and rejects a pending connect", async () => {
    const fake = fakeTransport();
    const store = createHaStore(fake.transport);

    const connecting = store.connect();
    fake.status("error");

    await expect(connecting).rejects.toThrow("Home Assistant connection failed");
    expect(store.getSnapshot()).toMatchObject({ status: "error", entities: {} });
    expect(fake.stopEntities).toHaveBeenCalled();
    expect(fake.stopConnection).toHaveBeenCalled();
  });

  it("fails closed when the entity subscription throws, without leaking the cause", async () => {
    const fake = fakeTransport({ subscribeEntities: () => { throw new Error("secret token rejected"); } });
    const store = createHaStore(fake.transport);

    await expect(store.connect()).rejects.toThrow("Home Assistant connection failed");
    expect(store.getSnapshot().status).toBe("error");
    expect(String(store.getSnapshot().error)).not.toContain("secret");
  });

  it("can connect again after a failure", async () => {
    let fail = true;
    const fake = fakeTransport();
    const subscribe = fake.transport.subscribeEntities;
    fake.transport.subscribeEntities = (listener) => {
      if (fail) throw new Error("down");
      return subscribe(listener);
    };
    const store = createHaStore(fake.transport);
    await expect(store.connect()).rejects.toThrow();

    fail = false;
    const retry = store.connect();
    fake.emit();
    await retry;

    expect(store.getSnapshot().status).toBe("connected");
  });

  it("disconnect unsubscribes, clears state, settles a pending connect, and ignores late events", async () => {
    const fake = fakeTransport();
    const store = createHaStore(fake.transport);
    const connecting = store.connect();

    store.disconnect();
    await expect(connecting).resolves.toBeUndefined();
    fake.emit();
    fake.status("error");

    expect(fake.stopEntities).toHaveBeenCalled();
    expect(fake.stopConnection).toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({ status: "disconnected", entities: {} });
  });

  it("subscribes again on connect after an explicit disconnect", async () => {
    const { store, transport, emit } = await connected();
    store.disconnect();

    const again = store.connect();
    emit();
    await again;

    expect(transport.subscribeEntities).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().status).toBe("connected");
  });

  it("does not close the host's transport", async () => {
    const close = vi.fn();
    const { store } = await connected({ close } as Partial<HaTransport>);
    store.disconnect();
    expect(close).not.toHaveBeenCalled();
  });
});

describe("createHaStore actions", () => {
  it("rejects service calls while not connected and records the error", async () => {
    const fake = fakeTransport();
    const store = createHaStore(fake.transport);

    await expect(store.callService("light", "toggle", { entity_id: "light.one" })).rejects.toMatchObject({
      code: "not_connected",
      domain: "light",
      service: "toggle",
      entityId: "light.one",
    });
    expect(store.getSnapshot().lastActionError?.code).toBe("not_connected");
    expect(fake.transport.callService).not.toHaveBeenCalled();
  });

  it("forwards service data, targets and response requests", async () => {
    const { store, transport } = await connected();

    await expect(store.callService("light", "turn_on", { entity_id: "light.one", brightness_pct: 50 })).resolves.toEqual({ ok: true });
    await store.callService("weather", "get_forecasts", { type: "daily" }, { target: { entity_id: "weather.home" }, returnResponse: true });

    expect(transport.callService).toHaveBeenNthCalledWith(1, "light", "turn_on", { entity_id: "light.one", brightness_pct: 50 });
    expect(transport.callService).toHaveBeenNthCalledWith(2, "weather", "get_forecasts", { type: "daily" }, { target: { entity_id: "weather.home" }, returnResponse: true });
  });

  it("validates service input before forwarding it", async () => {
    const { store, transport } = await connected();

    await expect(store.callService("light", "toggle", null as unknown as Record<string, unknown>)).rejects.toMatchObject({ code: "invalid_input" });
    await expect(store.callService("light", "toggle", {}, { target: { entity_id: 7 } } as never)).rejects.toMatchObject({ code: "invalid_input" });
    await expect(store.callService("light", "toggle", {}, { returnResponse: "yes" } as never)).rejects.toMatchObject({ code: "invalid_input" });
    await expect(store.callService("light", "toggle", {}, { extra: true } as never)).rejects.toMatchObject({ code: "invalid_input" });
    expect(transport.callService).not.toHaveBeenCalled();
    expect(store.getSnapshot().lastActionError?.code).toBe("invalid_input");
  });

  it("classifies a rejection as service_failed with only the provider's string scalars", async () => {
    const { store } = await connected({
      callService: vi.fn(async () => {
        throw { code: "service_validation_error", message: "Invalid code 1234", translation_key: "invalid_code" };
      }),
    });

    const error = await store.callService("alarm_control_panel", "alarm_disarm", { entity_id: "alarm_control_panel.home", code: "1234" }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(HaActionError);
    expect(error).toMatchObject({ code: "service_failed", translationKey: "invalid_code", providerCode: "service_validation_error" });
    expect((error as Error).message).not.toContain("1234");
    expect(store.getSnapshot().lastActionError).toBe(error);
  });

  it("classifies the library's connection-lost rejection as an unknown outcome", async () => {
    const { store } = await connected({ callService: vi.fn(async () => { throw { code: 3, message: "Connection lost" }; }) });
    await expect(store.callService("light", "toggle", {})).rejects.toMatchObject({ code: "transport_unknown" });

    const bare = await connected({ callService: vi.fn(async () => { throw 3; }) });
    await expect(bare.store.callService("light", "toggle", {})).rejects.toMatchObject({ code: "transport_unknown" });
  });

  it("does not treat an ordinary service message as transport loss", async () => {
    const { store } = await connected({ callService: vi.fn(async () => { throw new Error("connection lost"); }) });
    await expect(store.callService("light", "toggle", {})).rejects.toMatchObject({ code: "service_failed" });
  });

  it("reports a call that settles after the connection changed as an unknown outcome", async () => {
    let resolve!: (value: unknown) => void;
    const { store, status } = await connected({ callService: vi.fn(() => new Promise((res) => { resolve = res; })) });

    const pending = store.callService("light", "toggle", {});
    status("disconnected");
    resolve({ ok: true });

    await expect(pending).rejects.toMatchObject({ code: "transport_unknown" });
    // A failure from the old connection does not land in the new connection's action state.
    expect(store.getSnapshot().lastActionError).toBeUndefined();
  });

  it("keeps the latest action's outcome and clears it after a later success", async () => {
    const results: Array<(fail: boolean) => void> = [];
    const { store } = await connected({
      callService: vi.fn(() => new Promise((resolve, reject) => {
        results.push((fail) => (fail ? reject(new Error("no")) : resolve({ ok: true })));
      })),
    });

    const older = store.callService("light", "toggle", {});
    const newer = store.callService("light", "toggle", {});
    results[1](true);
    await newer.catch(() => undefined);
    results[0](false);
    await older;
    expect(store.getSnapshot().lastActionError?.code).toBe("service_failed");

    const later = store.callService("light", "toggle", {});
    results[2](false);
    await later;
    expect(store.getSnapshot().lastActionError).toBeUndefined();
  });

  it("retries the latest safe failed action and clears the error after success", async () => {
    let fail = true;
    const callService = vi.fn(async () => {
      if (fail) throw new Error("offline");
      return { ok: true };
    });
    const { store } = await connected({ callService });

    await store.callService("light", "toggle", { entity_id: "light.one" }).catch(() => undefined);
    expect(store.getSnapshot().lastActionError).toMatchObject({ code: "service_failed", category: "rejected", retryable: true });
    expect(store.canRetryLastAction?.()).toBe(true);

    fail = false;
    await expect(store.retryLastAction?.()).resolves.toEqual({ ok: true });
    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenLastCalledWith("light", "toggle", { entity_id: "light.one" });
    expect(store.getSnapshot().lastActionError).toBeUndefined();
  });

  it("never retains alarm codes or unknown-outcome actions for retry", async () => {
    const coded = await connected({ callService: vi.fn(async () => { throw new Error("rejected"); }) });
    await coded.store.callService("alarm_control_panel", "alarm_disarm", {
      entity_id: "alarm_control_panel.home",
      code: "1234",
    }).catch(() => undefined);
    expect(coded.store.canRetryLastAction?.()).toBe(false);
    await expect(coded.store.retryLastAction?.()).rejects.toMatchObject({ code: "unsupported" });

    // A lock without a code still asks first on its card; Retry would unlock with one tap.
    const lock = await connected({ callService: vi.fn(async () => { throw new Error("rejected"); }) });
    await lock.store.callService("lock", "unlock", { entity_id: "lock.front" }).catch(() => undefined);
    expect(lock.store.canRetryLastAction?.()).toBe(false);

    const unknown = await connected({ callService: vi.fn(async () => { throw 3; }) });
    await unknown.store.callService("cover", "open_cover", { entity_id: "cover.garage" }).catch(() => undefined);
    expect(unknown.store.getSnapshot().lastActionError).toMatchObject({ code: "transport_unknown", category: "connection", retryable: false });
    expect(unknown.store.canRetryLastAction?.()).toBe(false);
  });

  it("drops a retry once its entity has changed, so it can't undo what happened since", async () => {
    const { store, emit } = await connected({ callService: vi.fn(async () => { throw new Error("rejected"); }) });
    await store.callService("light", "toggle", { entity_id: "light.one" }).catch(() => undefined);
    expect(store.canRetryLastAction?.()).toBe(true);
    emit({ "light.one": { entity_id: "light.one", state: "off", attributes: {} } });
    expect(store.canRetryLastAction?.()).toBe(false);
    await expect(store.retryLastAction?.()).rejects.toMatchObject({ code: "unsupported" });
  });

  it("dismisses the latest action failure and its retry", async () => {
    const { store } = await connected({ callService: vi.fn(async () => { throw new Error("rejected"); }) });
    await store.callService("light", "toggle", { entity_id: "light.one" }).catch(() => undefined);

    store.clearActionError?.();

    expect(store.getSnapshot().lastActionError).toBeUndefined();
    expect(store.canRetryLastAction?.()).toBe(false);
  });

  it("keeps background queries out of action state", async () => {
    const { store } = await connected({ callService: vi.fn(async () => { throw new Error("no forecast"); }) });

    await expect(store.query("weather", "get_forecasts", { type: "daily" }, { target: { entity_id: "weather.home" }, returnResponse: true }))
      .rejects.toMatchObject({ code: "service_failed" });
    expect(store.getSnapshot().lastActionError).toBeUndefined();
  });
});

describe("createHaStore generic commands", () => {
  it("forwards a command and keeps it out of action state", async () => {
    const { store, transport } = await connected();

    await expect(store.callApi("config/area_registry/list")).resolves.toEqual(["registry"]);
    expect(transport.sendMessage).toHaveBeenCalledWith("config/area_registry/list", {});
  });

  it("rejects while disconnected, without sendMessage, or with invalid input", async () => {
    const fake = fakeTransport();
    const idle = createHaStore(fake.transport);
    await expect(idle.callApi("x")).rejects.toMatchObject({ code: "not_connected" });

    const { store } = await connected({ sendMessage: undefined });
    await expect(store.callApi("x")).rejects.toMatchObject({ code: "unsupported" });
    await expect(store.callApi("x", null as unknown as Record<string, unknown>)).rejects.toMatchObject({ code: "invalid_input" });
    expect(store.getSnapshot().lastActionError).toBeUndefined();
  });

  it("passes the provider's translation key and code through a rejection", async () => {
    const { store } = await connected({
      sendMessage: vi.fn(async () => { throw { code: "unknown_command", translation_key: "nope", message: "Unknown command." }; }),
    });

    await expect(store.callApi("history/history_during_period", {})).rejects.toMatchObject({
      code: "service_failed",
      providerCode: "unknown_command",
      translationKey: "nope",
    });
  });

  it("reports a command interrupted by connection loss as an unknown outcome", async () => {
    let reject!: (reason: unknown) => void;
    const { store, status } = await connected({ sendMessage: vi.fn(() => new Promise((_res, rej) => { reject = rej; })) });

    const pending = store.callApi("config/area_registry/list");
    status("disconnected");
    reject({ code: 3 });

    await expect(pending).rejects.toMatchObject({ code: "transport_unknown" });
  });
});
