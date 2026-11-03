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

const adapter = vi.hoisted(() => ({ createHomeAssistantTransport: vi.fn(), emitOnSubscribe: true }));
vi.mock("@dashhaus/core/websocket", () => adapter);
adapter.createHomeAssistantTransport.mockImplementation((): HaTransport => ({
  subscribeEntities(listener) {
    if (adapter.emitOnSubscribe) queueMicrotask(() => listener(entities));
    return () => undefined;
  },
  callService: async () => undefined,
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
});
