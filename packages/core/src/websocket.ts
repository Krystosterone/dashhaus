import type { Auth, Connection } from "home-assistant-js-websocket";
export type { Connection } from "home-assistant-js-websocket";
import { callService, createConnection, subscribeEntities } from "home-assistant-js-websocket";
import type { HaServiceCallOptions, HaTransport, Unsubscribe } from "./ha/types";

export interface HomeAssistantTransport extends HaTransport {
  /** Close the socket. The host that opened the connection owns closing it. */
  close: Unsubscribe;
}

/**
 * Adapt an already-authenticated official Home Assistant connection to the store's transport contract.
 * The library reconnects with backoff and resubscribes `subscribe_entities` on its own; this adapter only
 * forwards its `ready` / `disconnected` / `reconnect-error` events.
 */
export function createHomeAssistantTransport(connection: Connection): HomeAssistantTransport {
  return {
    subscribeEntities: (listener) => subscribeEntities(connection, listener),
    subscribeConnection(listener) {
      const ready = () => listener("connected");
      const disconnected = () => listener("disconnected");
      // Fired when a reconnect is refused for invalid auth; the library stops retrying.
      const refused = () => listener("error");
      connection.addEventListener("ready", ready);
      connection.addEventListener("disconnected", disconnected);
      connection.addEventListener("reconnect-error", refused);
      return () => {
        connection.removeEventListener("ready", ready);
        connection.removeEventListener("disconnected", disconnected);
        connection.removeEventListener("reconnect-error", refused);
      };
    },
    callService: (domain, service, serviceData, options: HaServiceCallOptions = {}) => (
      callService(connection, domain, service, serviceData, options.target, options.returnResponse)
    ),
    sendMessage: (type, payload = {}) => connection.sendMessagePromise({ ...payload, type }),
    close: () => connection.close(),
  };
}

/** Open an official Home Assistant websocket connection from host-owned auth. */
export async function connectHomeAssistant(auth: Auth): Promise<HomeAssistantTransport> {
  return createHomeAssistantTransport(await createConnection({ auth }));
}
