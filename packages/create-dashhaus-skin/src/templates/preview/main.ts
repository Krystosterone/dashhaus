/**
 * The preview: the real `custom:__card_type__` element from `lovelace/entry.tsx`, drawn the way Home Assistant draws
 * it (shadow root, the bundle's CSS, the store on a websocket connection), on the house in `./house.ts` instead of a
 * real one. `npm run preview` serves it; `npm run snapshot` saves it as PNGs.
 *
 * Query string: `?theme=dark` for Home Assistant's dark mode, `?yaml=<url-encoded JSON>` for a card config other than
 * the automatic layout, e.g. `?yaml={"title":"Kitchen","cards":[{"entity":"light.kitchen_ceiling"}]}`.
 * Presses work: a light toggles, and the card redraws from the store, as it would in Home Assistant.
 */
import "../lovelace/entry";
import { AREAS, ENTITY_AREAS, ENTITY_DEVICES, STATES } from "./house";
import type { PreviewState } from "./house";

const CARD_TYPE = "__card_type__";
const params = new URLSearchParams(location.search);
const dark = params.get("theme") === "dark";
const yaml = params.get("yaml");
const config = { type: `custom:${CARD_TYPE}`, title: "Home", ...(yaml ? JSON.parse(yaml) : {}) };

type Listener = (message: unknown) => void;
const stamp = new Date().toISOString();
const states: Record<string, PreviewState & { last_changed: string; last_updated: string; context: { id: string } }> = Object.fromEntries(
  STATES.map((state) => [state.entity_id, { ...state, last_changed: stamp, last_updated: stamp, context: { id: "preview" } }]),
);
const subscribers = new Set<Listener>();
const compressed = (state: (typeof states)[string]) => ({ s: state.state, a: state.attributes, c: state.context.id, lc: Date.parse(state.last_changed) / 1000 });

/** The part of home-assistant-js-websocket's `Connection` the store uses, answered from the house. */
const connection = {
  haVersion: "2026.10.0",
  connected: true,
  addEventListener() {},
  removeEventListener() {},
  async subscribeMessage(listener: Listener, message: { type: string }) {
    if (message.type !== "subscribe_entities") return async () => undefined;
    subscribers.add(listener);
    queueMicrotask(() => listener({ a: Object.fromEntries(Object.values(states).map((state) => [state.entity_id, compressed(state)])) }));
    return async () => void subscribers.delete(listener);
  },
  async sendMessagePromise(message: { type: string; domain?: string; service?: string; service_data?: Record<string, unknown>; target?: { entity_id?: string } }) {
    if (message.type === "get_states") return Object.values(states);
    if (message.type !== "call_service") return {};
    const id = message.target?.entity_id ?? (message.service_data?.entity_id as string | undefined);
    const state = id ? states[id] : undefined;
    if (!id || !state) throw { code: "not_found", message: `Entity ${id} not found` };
    const next = message.service === "turn_on" ? "on" : message.service === "turn_off" ? "off" : message.service === "toggle" ? (state.state === "on" ? "off" : "on") : state.state;
    const attributes = { ...state.attributes, brightness: next === "on" ? (state.attributes.brightness as number | null) ?? 255 : null };
    states[id] = { ...state, state: next, attributes, last_changed: new Date().toISOString() };
    for (const listener of subscribers) listener({ c: { [id]: { "+": { s: next, a: attributes, lc: Date.now() / 1000 } } } });
    return { context: { id: "preview" } };
  },
  close() {},
};

const hass = {
  connection,
  states,
  entities: Object.fromEntries(Object.keys(states).map((id) => [id, { area_id: ENTITY_AREAS[id] ?? null, device_id: ENTITY_DEVICES[id] ?? null, hidden: false, entity_category: null }])),
  devices: Object.fromEntries(Object.entries(ENTITY_DEVICES).map(([id, device]) => [device, { area_id: ENTITY_AREAS[id] ?? null }])),
  areas: Object.fromEntries(Object.entries(AREAS).map(([area_id, name]) => [area_id, { area_id, name }])),
  themes: { darkMode: dark },
  panels: {},
};

document.documentElement.dataset.theme = dark ? "dark" : "light";
const element = document.createElement(CARD_TYPE) as HTMLElement & { setConfig(config: unknown): void; hass: unknown };
try {
  element.setConfig(config);
  element.hass = hass;
  document.getElementById("view")!.append(element);
} catch (error) {
  const problem = document.createElement("pre");
  problem.textContent = `The card refused its config:\n${error instanceof Error ? error.message : String(error)}`;
  document.getElementById("view")!.append(problem);
}
