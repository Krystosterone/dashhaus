import { act } from "react";
// The card renders through its own React root, outside testing-library; tell React this is a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "home-assistant-js-websocket";
import type { HaTransport, HassEntities } from "../types";

const entities: HassEntities = {
  "light.kitchen": { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen", supported_color_modes: ["onoff"] } },
  "input_boolean.guest": { entity_id: "input_boolean.guest", state: "off", attributes: { friendly_name: "Guest" } },
};

const adapter = vi.hoisted(() => ({ createHomeAssistantTransport: vi.fn() }));
vi.mock("../home-assistant", () => adapter);
adapter.createHomeAssistantTransport.mockImplementation((): HaTransport => ({
  subscribeEntities(listener) {
    queueMicrotask(() => listener(entities));
    return () => undefined;
  },
  callService: async () => undefined,
}));

const { createHomeDashboardCard } = await import("./card");
const { DashboardConfigError } = await import("./config");

customElements.define("home-dashboard-test", createHomeDashboardCard(':root { --brand-h: 92; } :root[data-theme="dark"] { --ink: 0; }'));
type Card = HTMLElement & { setConfig(raw: unknown): void; hass: unknown };
const Element = customElements.get("home-dashboard-test") as unknown as { new (): Card; getStubConfig(hass: unknown): Record<string, unknown> };

const connection = {} as Connection;
const hass = (darkMode = false) => ({ connection, states: entities, themes: { darkMode } });

async function mount(config: Record<string, unknown>, darkMode = false) {
  const card = document.createElement("home-dashboard-test") as Card;
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

describe("home-dashboard card", () => {
  it("draws the configured sections inside its shadow root, with the tokens moved to the host", async () => {
    const card = await mount({ title: "Flat", sections: [{ title: "Lights", cards: ["light.kitchen"] }] });
    const shadow = card.shadowRoot!;
    expect(shadow.querySelector("style")?.textContent).toContain(':host([data-theme="dark"])');
    expect(shadow.querySelector(".dash-sec-h")?.textContent).toBe("Lights");
    expect(shadow.textContent).toContain("Kitchen");
  });

  it("follows Home Assistant's dark mode unless the config picks a theme", async () => {
    expect((await mount({}, true)).getAttribute("data-theme")).toBe("dark");
    expect((await mount({}, false)).getAttribute("data-theme")).toBe("light");
    expect((await mount({ theme: "auto" }, true)).hasAttribute("data-theme")).toBe(false);
  });

  it("applies the accent on the host", async () => {
    const card = await mount({ accent: { chroma: 0.1, hue: 200 } });
    expect(card.style.getPropertyValue("--brand-h")).toBe("200");
  });

  it("lays the house out by itself without sections", async () => {
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
    const card = document.createElement("home-dashboard-test") as Card;
    expect(() => card.setConfig({ sections: [{ cards: [{ entity: "light.a", footprnt: "compact" }] }] })).toThrow(DashboardConfigError);
    expect(() => card.setConfig({ sections: [{ cards: [{ entity: "light.a", footprnt: "compact" }] }] })).toThrow('did you mean "footprint"?');
  });

  it("pre-fills the card picker with the automatic layout spelled out", () => {
    expect(Element.getStubConfig(hass())).toMatchObject({ type: "custom:home-dashboard", sections: [{ title: "Modes" }, { title: "Other" }] });
  });
});
