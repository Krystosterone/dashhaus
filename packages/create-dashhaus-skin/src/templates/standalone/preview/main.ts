/**
 * The preview: the real `custom:__card_type__` element from `lovelace/entry.tsx`, drawn the way Home Assistant draws
 * it (shadow root, the bundle's CSS, the store on a websocket connection), on a sample house instead of a real one.
 * `npm run preview` serves it; `npm run snapshot` saves it as PNGs.
 *
 * The house is two parts. `./house.ts` is yours: the domains it lists (lights and sensors to start) come only from
 * it, with its worst cases, and a press on one of its entities switches it on or off. Every other domain comes from
 * @dashhaus/core's demo house, whose services behave like Home Assistant's, so a card added with
 * `npm run add -- <domain>` shows up here with no edit, in the Living room.
 *
 * Query string: `?theme=dark` for Home Assistant's dark mode, `?yaml=<url-encoded JSON>` for a card config other than
 * the automatic layout, e.g. `?yaml={"title":"Kitchen","cards":[{"entity":"light.kitchen_ceiling"}]}`.
 */
import "../lovelace/entry";
import { createDemoHouseTransport } from "@dashhaus/core/demo";
import { AREAS, ENTITY_AREAS, ENTITY_DEVICES, STATES } from "./house";
import type { PreviewState } from "./house";

const CARD_TYPE = "__card_type__";
const params = new URLSearchParams(location.search);
const dark = params.get("theme") === "dark";
const yaml = params.get("yaml");
const config = { type: `custom:${CARD_TYPE}`, title: "Home", ...(yaml ? JSON.parse(yaml) : {}) };

type State = PreviewState & { last_changed: string; last_updated: string; context: { id: string } };
type Listener = (message: unknown) => void;
const domainOf = (entityId: string) => entityId.slice(0, entityId.indexOf("."));
const stamp = new Date().toISOString();

/** The house's own entities, by id; the demo's, by id, for every domain the house doesn't list. */
const own: Record<string, State> = Object.fromEntries(STATES.map((state) => [state.entity_id, { ...state, last_changed: stamp, last_updated: stamp, context: { id: "preview" } }]));
const ownDomains = new Set(STATES.map((state) => domainOf(state.entity_id)));
let demo: Record<string, State> = {};
const DEMO_AREA = "living_room";

const subscribers = new Set<Listener>();
const compressed = (state: State) => ({ s: state.state, a: state.attributes, c: state.context.id, lc: Date.parse(state.last_changed) / 1000 });
const send = (states: State[]) => {
  const message = { a: Object.fromEntries(states.map((state) => [state.entity_id, compressed(state)])) };
  for (const listener of subscribers) listener(message);
};

const house = createDemoHouseTransport();
await new Promise<void>((ready) => {
  house.subscribeEntities((entities) => {
    demo = Object.fromEntries(Object.values(entities)
      .filter((entity) => !ownDomains.has(domainOf(entity.entity_id)))
      .map((entity) => [entity.entity_id, { ...entity, last_changed: entity.last_changed ?? stamp, last_updated: entity.last_updated ?? stamp, context: { id: "demo" } } as State]));
    send(Object.values(demo));
    ready();
  });
});

/** The part of home-assistant-js-websocket's `Connection` the store uses, answered from the house. */
const connection = {
  haVersion: "2026.10.0",
  connected: true,
  addEventListener() {},
  removeEventListener() {},
  async subscribeMessage(listener: Listener, message: { type: string }) {
    if (message.type !== "subscribe_entities") return async () => undefined;
    subscribers.add(listener);
    queueMicrotask(() => listener({ a: Object.fromEntries([...Object.values(own), ...Object.values(demo)].map((state) => [state.entity_id, compressed(state)])) }));
    return async () => void subscribers.delete(listener);
  },
  async sendMessagePromise(message: { type: string; domain?: string; service?: string; service_data?: Record<string, unknown>; target?: { entity_id?: string } }) {
    if (message.type === "get_states") return [...Object.values(own), ...Object.values(demo)];
    if (message.type !== "call_service") return house.sendMessage?.(message.type, message).catch(() => ({})) ?? {};
    const id = message.target?.entity_id ?? (message.service_data?.entity_id as string | undefined);
    if (id && demo[id]) return house.callService(message.domain!, message.service!, message.service_data, { target: message.target });
    const state = id ? own[id] : undefined;
    if (!id || !state) throw { code: "not_found", message: `Entity ${id} not found` };
    const next = message.service === "turn_on" ? "on" : message.service === "turn_off" ? "off" : message.service === "toggle" ? (state.state === "on" ? "off" : "on") : state.state;
    const attributes = { ...state.attributes, brightness: next === "on" ? (state.attributes.brightness as number | null) ?? 255 : null };
    own[id] = { ...state, state: next, attributes, last_changed: new Date().toISOString() };
    for (const listener of subscribers) listener({ c: { [id]: { "+": { s: next, a: attributes, lc: Date.now() / 1000 } } } });
    return { context: { id: "preview" } };
  },
  close() {},
};

const areaOf = (id: string) => ENTITY_AREAS[id] ?? (demo[id] ? DEMO_AREA : null);
const ids = [...Object.keys(own), ...Object.keys(demo)];
const hass = {
  connection,
  states: { ...own, ...demo },
  entities: Object.fromEntries(ids.map((id) => [id, { area_id: areaOf(id), device_id: ENTITY_DEVICES[id] ?? null, hidden: false, entity_category: null }])),
  devices: Object.fromEntries(Object.entries(ENTITY_DEVICES).map(([id, device]) => [device, { area_id: ENTITY_AREAS[id] ?? null }])),
  areas: Object.fromEntries(Object.entries({ [DEMO_AREA]: "Living room", ...AREAS }).map(([area_id, name]) => [area_id, { area_id, name }])),
  themes: { darkMode: dark },
  panels: {},
};

document.documentElement.setAttribute("data-__skin__-theme", dark ? "dark" : "light");
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
