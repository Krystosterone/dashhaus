export type HassAttributes = Record<string, unknown>;

/** Raw Home Assistant state object kept losslessly at the integration boundary. */
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: HassAttributes;
  last_changed?: string;
  last_updated?: string;
  last_reported?: string;
  context?: unknown;
}

export type HassEntities = Record<string, HassEntity>;
export type Unsubscribe = () => void;
export type EntityListener = (entities: HassEntities) => void;
export type HaTransportConnectionStatus = "connected" | "disconnected" | "error";
export type ConnectionStatusListener = (status: HaTransportConnectionStatus) => void;

export interface HaServiceTarget {
  entity_id?: string | string[];
  device_id?: string | string[];
  area_id?: string | string[];
  floor_id?: string | string[];
  label_id?: string | string[];
}

export interface HaServiceCallOptions {
  target?: HaServiceTarget;
  returnResponse?: boolean;
}

/** The smallest transport contract needed by the shared store. */
export interface HaTransport {
  /**
   * Deliver the full entity map now and after every change, keeping unchanged entities' object
   * identity. The transport keeps this subscription alive across its own reconnects.
   */
  subscribeEntities(listener: EntityListener): Unsubscribe;
  /** Report loss ("disconnected"), recovery ("connected") and a terminal failure ("error"). */
  subscribeConnection?: (listener: ConnectionStatusListener) => Unsubscribe;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    options?: HaServiceCallOptions,
  ): Promise<unknown>;
  /** Generic websocket command (e.g. history reads). Optional so injected demo transports stay valid. */
  sendMessage?: (type: string, payload?: Record<string, unknown>) => Promise<unknown>;
  /**
   * Turn a Home Assistant path (an entity's `entity_picture`) into a URL this page can load, or nothing when it
   * can't. Optional: without it a path stays as Home Assistant gave it, relative to the page.
   */
  resolveUrl?: (path: string) => string | undefined;
}

export type HaConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export type HaActionErrorCode = "not_connected" | "service_failed" | "transport_unknown" | "unsupported" | "invalid_input";

export type HaActionErrorCategory = "connection" | "rejected" | "unsupported" | "invalid_input";

export interface HaActionErrorMetadata {
  category: HaActionErrorCategory;
  /** Safe to repeat on the current connection, not a promise that the repeat succeeds. */
  retryable: boolean;
}

/** The one code-to-metadata rule. The store's retry policy reads it, so a new code cannot drift. */
export const HA_ACTION_ERROR_META: Record<HaActionErrorCode, HaActionErrorMetadata> = {
  not_connected: { category: "connection", retryable: true },
  service_failed: { category: "rejected", retryable: true },
  transport_unknown: { category: "connection", retryable: false },
  unsupported: { category: "unsupported", retryable: false },
  invalid_input: { category: "invalid_input", retryable: false },
};

export class HaActionError extends Error {
  readonly code: HaActionErrorCode;
  readonly category: HaActionErrorCategory;
  readonly retryable: boolean;
  readonly domain?: string;
  readonly service?: string;
  readonly entityId?: string;
  /** Sanitized provider translation key, surfaced only as a string scalar. */
  readonly translationKey?: string;
  /** Sanitized provider code, surfaced only as a string scalar. */
  readonly providerCode?: string;

  constructor(
    code: HaActionErrorCode,
    message: string,
    details: {
      domain?: string;
      service?: string;
      entityId?: string;
      translationKey?: string;
      providerCode?: string;
    } = {},
  ) {
    super(message);
    this.name = "HaActionError";
    this.code = code;
    const meta = HA_ACTION_ERROR_META[code];
    this.category = meta.category;
    this.retryable = meta.retryable;
    this.domain = details.domain;
    this.service = details.service;
    this.entityId = details.entityId;
    this.translationKey = details.translationKey;
    this.providerCode = details.providerCode;
  }
}

export interface HaSnapshot {
  status: HaConnectionStatus;
  entities: HassEntities;
  error?: unknown;
  lastActionError?: HaActionError;
  /** Increments whenever the connection is lost, recovers, fails, or the store connects or disconnects. */
  generation: number;
}

export interface HaStore {
  getSnapshot(): HaSnapshot;
  subscribe(listener: () => void): () => void;
  connect(): Promise<void>;
  /** Stop subscriptions and clear stale state. The host that opened the transport owns closing it. */
  disconnect(): void;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    options?: HaServiceCallOptions,
  ): Promise<unknown>;
  /** Clear the latest action failure after the host has acknowledged it. */
  clearActionError?(): void;
  /** Whether the latest failed action is safe to repeat on the current connection. */
  canRetryLastAction?(): boolean;
  /** Repeat the latest safe failed action. Sensitive action data is never retained for retry. */
  retryLastAction?(): Promise<unknown>;
  /** Background read-only request that stays out of action ordering and `lastActionError`. */
  query(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    options?: HaServiceCallOptions,
  ): Promise<unknown>;
  /** Generic websocket command (e.g. recorder history reads) that stays out of action ordering and `lastActionError`. */
  callApi(type: string, payload?: Record<string, unknown>): Promise<unknown>;
  /** An entity's picture path as a URL this page can load (`resolvePicture` over the transport's `resolveUrl`). */
  resolveUrl?(path: string): string | undefined;
}
