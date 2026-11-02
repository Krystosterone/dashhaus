import { act } from "react";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "@dashhaus/core/websocket";
import type { HaTransport } from "@dashhaus/core";
import { create__Skin__Card } from "./card";
import { __SKIN_CONST___THEME_ATTRIBUTE } from "../shared/surface";

const adapter = vi.hoisted(() => ({ createHomeAssistantTransport: vi.fn() }));
vi.mock("@dashhaus/core/websocket", () => adapter);
adapter.createHomeAssistantTransport.mockImplementation((): HaTransport => ({ subscribeEntities: (listener) => { queueMicrotask(() => listener({})); return () => undefined; }, callService: async () => undefined }));
customElements.define("dashhaus-__skin__-test", create__Skin__Card(":root { --__skin__-page: #fff; }"));
type Card = HTMLElement & { setConfig(raw: unknown): void; hass: unknown };
const connection = {} as Connection;

afterEach(async () => { await act(async () => document.body.replaceChildren()); adapter.createHomeAssistantTransport.mockClear(); });

describe("dashhaus-__skin__", () => {
  it("renders a usable empty Dashboard and reuses one store per connection", async () => {
    const card = document.createElement("dashhaus-__skin__-test") as Card;
    card.setConfig({ title: "Home" });
    card.hass = { connection, states: {}, themes: { darkMode: false } };
    await act(async () => { document.body.append(card); await Promise.resolve(); });
    expect(card.shadowRoot?.querySelector(".__skin__-header h1")?.textContent).toBe("Home");
    expect(card.shadowRoot?.querySelector(".__skin__-dashboard-empty")?.textContent).toContain("No entities this skin can draw yet");
    card.hass = { connection, states: {}, themes: { darkMode: true } };
    expect(adapter.createHomeAssistantTransport).toHaveBeenCalledTimes(1);
  });

  it("keys its theme on the skin's own host attribute, never the shared data-theme", async () => {
    const card = document.createElement("dashhaus-__skin__-test") as Card;
    card.setConfig({ title: "Home" });
    card.hass = { connection, states: {}, themes: { darkMode: true } };
    await act(async () => { document.body.append(card); await Promise.resolve(); });
    expect(__SKIN_CONST___THEME_ATTRIBUTE).toBe("data-__skin__-theme");
    expect(card.getAttribute(__SKIN_CONST___THEME_ATTRIBUTE)).toBe("dark");
    expect(card.hasAttribute("data-theme")).toBe(false);
    card.hass = { connection, states: {}, themes: { darkMode: false } };
    expect(card.getAttribute(__SKIN_CONST___THEME_ATTRIBUTE)).toBe("light");
  });
});
