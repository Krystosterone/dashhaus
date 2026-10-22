import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "home-assistant-js-websocket";

const library = vi.hoisted(() => ({
  subscribeEntities: vi.fn(),
  callService: vi.fn(),
  createConnection: vi.fn(),
}));
vi.mock("home-assistant-js-websocket", () => library);

const { connectHomeAssistant, createHomeAssistantTransport } = await import("./home-assistant");

function fakeConnection() {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  const connection = {
    addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)?.add(handler);
    }),
    removeEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.get(event)?.delete(handler);
    }),
    sendMessagePromise: vi.fn(async () => ["result"]),
    close: vi.fn(),
  };
  const fire = (event: string, ...args: unknown[]) => handlers.get(event)?.forEach((handler) => handler(connection, ...args));
  return { connection: connection as unknown as Connection, raw: connection, fire, handlers };
}

beforeEach(() => {
  library.subscribeEntities.mockReset();
  library.callService.mockReset();
  library.createConnection.mockReset();
});

describe("createHomeAssistantTransport", () => {
  it("subscribes entities through the library collection, which resubscribes on reconnect", () => {
    const { connection } = fakeConnection();
    const unsubscribe = vi.fn();
    library.subscribeEntities.mockReturnValue(unsubscribe);
    const listener = vi.fn();

    const stop = createHomeAssistantTransport(connection).subscribeEntities(listener);

    expect(library.subscribeEntities).toHaveBeenCalledWith(connection, listener);
    expect(stop).toBe(unsubscribe);
  });

  it("maps ready, disconnected and reconnect-error to connection statuses, and unsubscribes them", () => {
    const { connection, fire, handlers } = fakeConnection();
    const listener = vi.fn();

    const stop = createHomeAssistantTransport(connection).subscribeConnection?.(listener);
    fire("disconnected");
    fire("ready");
    fire("reconnect-error", 2);

    expect(listener.mock.calls).toEqual([["disconnected"], ["connected"], ["error"]]);
    stop?.();
    expect([...handlers.values()].every((set) => set.size === 0)).toBe(true);
  });

  it("calls services with the target and response flag", async () => {
    const { connection } = fakeConnection();
    library.callService.mockResolvedValue({ response: {} });

    const transport = createHomeAssistantTransport(connection);
    await transport.callService("light", "toggle", { entity_id: "light.one" });
    await transport.callService("weather", "get_forecasts", { type: "daily" }, { target: { entity_id: "weather.home" }, returnResponse: true });

    expect(library.callService).toHaveBeenNthCalledWith(1, connection, "light", "toggle", { entity_id: "light.one" }, undefined, undefined);
    expect(library.callService).toHaveBeenNthCalledWith(2, connection, "weather", "get_forecasts", { type: "daily" }, { entity_id: "weather.home" }, true);
  });

  it("sends generic commands with the type last so a payload cannot override it", async () => {
    const { connection, raw } = fakeConnection();

    await createHomeAssistantTransport(connection).sendMessage?.("history/history_during_period", { type: "spoof", entity_ids: ["light.one"] });

    expect(raw.sendMessagePromise).toHaveBeenCalledWith({ type: "history/history_during_period", entity_ids: ["light.one"] });
  });

  it("closes the connection", () => {
    const { connection, raw } = fakeConnection();
    createHomeAssistantTransport(connection).close();
    expect(raw.close).toHaveBeenCalled();
  });
});

describe("connectHomeAssistant", () => {
  it("opens a connection from host-owned auth", async () => {
    const { connection } = fakeConnection();
    library.createConnection.mockResolvedValue(connection);
    const auth = { accessToken: "token" };

    const transport = await connectHomeAssistant(auth as never);

    expect(library.createConnection).toHaveBeenCalledWith({ auth });
    expect(typeof transport.subscribeEntities).toBe("function");
  });
});
