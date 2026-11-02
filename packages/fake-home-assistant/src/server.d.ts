import type { FakeHomeAssistant, FakeHomeAssistantOptions } from "./fake-home-assistant.js";

/** The three `.env` values a Dashhaus deploy reads. */
export interface FakeHomeAssistantSettings {
  HA_URL: string;
  HA_TOKEN: string;
  HA_WWW: string;
}

export interface StartFakeHomeAssistantOptions extends FakeHomeAssistantOptions {
  /** The port to listen on; 0 picks a free one. Defaults to 8123. */
  port?: number;
  /** The interface to bind. Defaults to 127.0.0.1. */
  host?: string;
  /** The folder served at /local/; a new temporary one when omitted. */
  www?: string;
  /** The token clients authenticate with. Defaults to fake-ha-token. */
  token?: string;
  /** Write resources, dashboards, saved layouts and the command log here after every command. */
  stateFile?: string;
}

export interface FakeHomeAssistantServer {
  ha: FakeHomeAssistant;
  settings: FakeHomeAssistantSettings;
  /** Stop listening and close every open connection. */
  close(): Promise<void>;
}

/** Start the server; resolves with its settings and a `close()`. */
export function startFakeHomeAssistant(options?: StartFakeHomeAssistantOptions): Promise<FakeHomeAssistantServer>;
