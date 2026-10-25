import { act } from "react";
// The card renders through its own React root, outside testing-library; tell React this is a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "home-assistant-js-websocket";
import type { HaTransport, HassEntities } from "../../types";

const entities: HassEntities = {
  "light.kitchen": { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen", supported_color_modes: ["onoff"] } },
  "input_boolean.guest": { entity_id: "input_boolean.guest", state: "off", attributes: { friendly_name: "Guest" } },
  "sensor.temperature": { entity_id: "sensor.temperature", state: "21", attributes: { friendly_name: "Temperature" } },
};

const adapter = vi.hoisted(() => ({ createHomeAssistantTransport: vi.fn() }));
vi.mock("../../home-assistant", () => adapter);
adapter.createHomeAssistantTransport.mockImplementation((): HaTransport => ({
  subscribeEntities(listener) {
    queueMicrotask(() => listener(entities));
    return () => undefined;
  },
  callService: async () => undefined,
}));

const { createGlassCard } = await import("./card");
const { DashboardConfigError } = await import("../config");

customElements.define("home-dashboard-glass-test", createGlassCard(":root { --press: 160ms; }"));
type Card = HTMLElement & { setConfig(raw: unknown): void; hass: unknown };
const Element = customElements.get("home-dashboard-glass-test") as unknown as { new (): Card; getStubConfig(): Record<string, unknown> };

const connection = {} as Connection;
const hass = (name = "Sam") => ({
  connection,
  states: entities,
  user: { name },
  entities: { "light.kitchen": { device_id: "lamp" } },
  devices: { lamp: { area_id: "kitchen" } },
  areas: { kitchen: { name: "Kitchen area" } },
});

async function mount(config: Record<string, unknown>) {
  const card = document.createElement("home-dashboard-glass-test") as Card;
  card.setConfig(config);
  card.hass = hass();
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

describe("home-dashboard-glass card", () => {
  it("draws every supported entity by itself, greets the signed-in person, and files cards by area", async () => {
    const card = await mount({ title: "Laid-back home" });
    const shadow = card.shadowRoot!;
    expect(shadow.querySelector("style")?.textContent).toContain(":host { --press: 160ms; }");
    expect(shadow.querySelector(".gl-title")?.textContent).toBe("Laid-back home");
    expect(shadow.querySelector(".gl-greeting")?.textContent).toMatch(/, Sam$/);
    expect([...shadow.querySelectorAll(".gl-name")].map((n) => n.textContent)).toEqual(["Guest", "Kitchen"]);
    expect([...shadow.querySelectorAll(".gl-room")].map((r) => r.textContent)).toEqual(["Home", "Kitchen area"]);
  });

  it("draws only the configured cards when given", async () => {
    const card = await mount({ name: "Alex", cards: [{ entity: "light.kitchen", name: "Pendant", area: "Dining" }] });
    const shadow = card.shadowRoot!;
    expect([...shadow.querySelectorAll(".gl-name")].map((n) => n.textContent)).toEqual(["Pendant"]);
    expect(shadow.querySelector(".gl-greeting")?.textContent).toMatch(/, Alex$/);
    expect([...shadow.querySelectorAll(".gl-room")].map((r) => r.textContent)).toEqual(["Home", "Dining"]);
  });

  it("keeps one store per connection as hass updates", async () => {
    const card = await mount({});
    card.hass = hass();
    card.hass = hass();
    expect(adapter.createHomeAssistantTransport).toHaveBeenCalledTimes(1);
  });

  it("throws every config problem for the YAML editor to show", () => {
    const card = document.createElement("home-dashboard-glass-test") as Card;
    expect(() => card.setConfig({ cards: [{ entity: "light.a", sise: "m" }] })).toThrow(DashboardConfigError);
    expect(() => card.setConfig({ cards: [{ entity: "light.a", sise: "m" }] })).toThrow('did you mean "size"?');
  });

  it("pre-fills the card picker in automatic mode", () => {
    expect(Element.getStubConfig()).toEqual({ type: "custom:home-dashboard-glass" });
  });
});
