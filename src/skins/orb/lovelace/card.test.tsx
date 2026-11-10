import { act } from "react";
// The card renders through its own React root, outside testing-library; tell React this is a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "@dashhaus/core/websocket";
import type { HaTransport, HassEntities } from "@dashhaus/core";

const entities: HassEntities = {
  "light.kitchen": { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen", supported_color_modes: ["onoff"] } },
  "input_boolean.guest": { entity_id: "input_boolean.guest", state: "off", attributes: { friendly_name: "Guest" } },
};

const adapter = vi.hoisted(() => ({
  createHomeAssistantTransport: vi.fn(),
  emitOnSubscribe: true,
  /** The house's entities and registries, for a test that needs another house. */
  house: undefined as undefined | { states: HassEntities; sendMessage: (type: string) => Promise<unknown> },
}));
vi.mock("@dashhaus/core/websocket", () => adapter);
adapter.createHomeAssistantTransport.mockImplementation((): HaTransport => ({
  subscribeEntities(listener) {
    if (adapter.emitOnSubscribe) queueMicrotask(() => listener(adapter.house?.states ?? entities));
    return () => undefined;
  },
  callService: async () => undefined,
  ...(adapter.house && { sendMessage: adapter.house.sendMessage }),
}));

const { createDashhausCard } = await import("./card");
const { DashboardConfigError } = await import("./config");

customElements.define("dashhaus-test", createDashhausCard(':root { --brand-h: 92; } :root[data-orb-theme="dark"] { --ink: 0; }'));
type Card = HTMLElement & { setConfig(raw: unknown): void; hass: unknown };
const Element = customElements.get("dashhaus-test") as unknown as { new (): Card; getStubConfig(hass: unknown): Record<string, unknown> };

const connection = {} as Connection;
const hass = (darkMode = false) => ({ connection, states: entities, themes: { darkMode } });

async function mount(config: Record<string, unknown>, darkMode = false) {
  const card = document.createElement("dashhaus-test") as Card;
  card.setConfig(config);
  card.hass = hass(darkMode);
  await act(async () => {
    document.body.append(card);
    await Promise.resolve();
  });
  return card;
}

afterEach(async () => {
  await act(async () => document.body.replaceChildren());
  adapter.createHomeAssistantTransport.mockClear();
});

describe("dashhaus-orb card", () => {
  it("draws the configured rows inside its shadow root, with the tokens moved to the host", async () => {
    const card = await mount({ title: "Flat", rows: [{ title: "Lights", cards: ["light.kitchen"] }] });
    const shadow = card.shadowRoot!;
    expect(shadow.querySelector("style")?.textContent).toContain(':host([data-orb-theme="dark"])');
    expect(shadow.querySelector("style")?.textContent).toContain("--dash-scroll-offset: calc(var(--header-height, 56px)");
    expect(shadow.querySelector(".dash-sec-h")?.textContent).toBe("Lights");
    expect(shadow.textContent).toContain("Kitchen");
  });

  it("draws Home Assistant's states before its own subscription answers", async () => {
    adapter.emitOnSubscribe = false;
    try {
      const card = await mount({ title: "Flat", rows: [{ title: "Lights", cards: ["light.kitchen"] }] });
      expect(card.shadowRoot!.textContent).toContain("Kitchen");
    } finally {
      adapter.emitOnSubscribe = true;
    }
  });

  it("follows Home Assistant's dark mode unless the config picks a theme", async () => {
    expect((await mount({}, true)).getAttribute("data-orb-theme")).toBe("dark");
    expect((await mount({}, false)).getAttribute("data-orb-theme")).toBe("light");
    expect((await mount({ theme: "auto" }, true)).hasAttribute("data-orb-theme")).toBe(false);
    expect((await mount({}, true)).hasAttribute("data-theme")).toBe(false);
  });

  it("applies the accent on the host", async () => {
    const card = await mount({ accent: { chroma: 0.1, hue: 200 } });
    expect(card.style.getPropertyValue("--brand-h")).toBe("200");
  });

  it("lays the house out by itself without cards or rows", async () => {
    const card = await mount({});
    const headings = [...card.shadowRoot!.querySelectorAll(".dash-sec-h")].map((h) => h.textContent);
    expect(headings).toEqual(["Modes", "Other"]);
  });

  it("lays the house out one column per area with layout: wall, each under its area's heading, and no nav when far", async () => {
    const light = (entity_id: string, friendly_name: string) => ({ entity_id, state: "on", attributes: { friendly_name, supported_color_modes: ["onoff"] } });
    const states: HassEntities = {
      "light.kitchen": light("light.kitchen", "Ceiling"),
      "light.hall": light("light.hall", "Ceiling"),
      "light.attic": light("light.attic", "Lamp"),
      "alarm_control_panel.house": { entity_id: "alarm_control_panel.house", state: "disarmed", attributes: { friendly_name: "House alarm" } },
    };
    const registry: Record<string, unknown> = {
      "config/entity_registry/list_for_display": { entity_categories: {}, entities: [{ ei: "light.kitchen", ai: "kitchen" }, { ei: "light.hall", ai: "hall" }, { ei: "light.attic", ai: "attic" }] },
      "config/device_registry/list": [],
      "config/area_registry/list": [{ area_id: "kitchen", name: "Kitchen" }, { area_id: "hall", name: "Hall" }, { area_id: "attic", name: "Attic" }],
      "config/floor_registry/list": [],
    };
    adapter.house = { states, sendMessage: async (type) => registry[type] };
    try {
      const card = document.createElement("dashhaus-test") as Card;
      card.setConfig({ layout: "wall", viewing: "far" });
      card.hass = {
        connection: { sendMessagePromise: async () => undefined } as unknown as Connection,
        states,
        entities: { "light.kitchen": { area_id: "kitchen" }, "light.hall": { area_id: "hall" }, "light.attic": { area_id: "attic" } },
        areas: { kitchen: { name: "Kitchen" }, hall: { name: "Hall" }, attic: { name: "Attic" } },
        themes: { darkMode: false },
      };
      await act(async () => {
        document.body.append(card);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const shadow = card.shadowRoot!;
      // In Home Assistant's order, not by name: Kitchen and Hall, then the house's alarm ending the first row; the
      // attic wraps into the next.
      const columns = [...shadow.querySelectorAll(".dash-row--areas .dash-col")];
      expect(columns.map((column) => column.getAttribute("aria-label"))).toEqual(["Kitchen", "Hall", null, "Attic"]);
      // Each column's stack is one track, so the attention budget damps down it as in a one-column Section.
      expect(columns.map((column) => column.querySelector(".dash-row")?.getAttribute("data-tracks"))).toEqual(["1", "1", "1", "1"]);
      expect([...shadow.querySelectorAll(".dash-col > h2")].map((h) => h.textContent)).toEqual(["Kitchen", "Hall", "Attic"]);
      // Two lights named alike, told apart by the heading over each, not by an area line of their own.
      expect([...shadow.querySelectorAll(".dash-col .hd-area")].map((line) => line.textContent)).not.toContain("Hall");
      expect(shadow.querySelector(".dash-dock")).toBeNull();
    } finally {
      adapter.house = undefined;
    }
  });

  it("keeps one store per connection as hass updates", async () => {
    const card = await mount({});
    card.hass = hass();
    card.hass = hass();
    expect(adapter.createHomeAssistantTransport).toHaveBeenCalledTimes(1);
  });

  it("throws every config problem for the YAML editor to show", () => {
    const card = document.createElement("dashhaus-test") as Card;
    expect(() => card.setConfig({ cards: [{ entity: "light.a", footprnt: "compact" }] })).toThrow(DashboardConfigError);
    expect(() => card.setConfig({ cards: [{ entity: "light.a", footprnt: "compact" }] })).toThrow('did you mean "footprint"?');
  });

  it("pre-fills the card picker with the automatic layout spelled out", () => {
    expect(Element.getStubConfig(hass())).toMatchObject({ type: "custom:dashhaus-orb", rows: [{ title: "Modes" }, { title: "Other" }] });
  });

  it("adds the house's energy under Energy, last, when Home Assistant's energy preferences land, and never asks for rows laid out by hand", async () => {
    let answer!: (value: unknown) => void;
    const sendMessagePromise = vi.fn(() => new Promise((resolve) => { answer = resolve; }));
    const untouched = vi.fn(async () => undefined);
    const states: HassEntities = { ...entities, "sensor.grid_power": { entity_id: "sensor.grid_power", state: "-1240", attributes: { friendly_name: "Grid", device_class: "power", unit_of_measurement: "W" } } };
    const energyHass = { connection: { sendMessagePromise } as unknown as Connection, states, themes: { darkMode: false } };
    const laidOut = document.createElement("dashhaus-test") as Card;
    laidOut.setConfig({ rows: [{ title: "Lights", cards: ["light.kitchen"] }] });
    laidOut.hass = { ...energyHass, connection: { sendMessagePromise: untouched } as unknown as Connection };
    const card = document.createElement("dashhaus-test") as Card;
    card.setConfig({});
    card.hass = energyHass;
    await act(async () => {
      document.body.append(laidOut, card);
      await Promise.resolve();
    });
    const headings = () => [...card.shadowRoot!.querySelectorAll(".dash-sec-h")].map((h) => h.textContent);
    expect(headings()).toEqual(["Modes", "Other"]);
    expect(Element.getStubConfig(energyHass)).toMatchObject({ rows: [{ title: "Modes" }, { title: "Other" }] });
    await act(async () => {
      answer({ energy_sources: [{ type: "grid", stat_energy_from: null, stat_rate: "sensor.grid_power" }] });
      await Promise.resolve();
    });
    expect(headings()).toEqual(["Modes", "Other", "Energy"]);
    expect(sendMessagePromise).toHaveBeenCalledTimes(1);
    expect(untouched).not.toHaveBeenCalled();
    // The card picker's pre-fill spells out what the page already holds.
    expect(Element.getStubConfig(energyHass)).toMatchObject({ rows: [{ title: "Modes" }, { title: "Other" }, { title: "Energy", cards: [{ entity: "sensor.grid_power", card: "numeric" }] }] });
  });
});
