import { act } from "react";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "@dashhaus/core/websocket";
import type { HaTransport } from "@dashhaus/core";
import { createFuturaCard } from "./card";

const adapter = vi.hoisted(() => ({ createHomeAssistantTransport: vi.fn() }));
vi.mock("@dashhaus/core/websocket", () => adapter);
adapter.createHomeAssistantTransport.mockImplementation((): HaTransport => ({ subscribeEntities: (listener) => { queueMicrotask(() => listener({})); return () => undefined; }, callService: async () => undefined }));
customElements.define("dashhaus-futura-test", createFuturaCard(":root { --futura-page: #fff; }"));
type Card = HTMLElement & { setConfig(raw: unknown): void; hass: unknown };
const connection = {} as Connection;

afterEach(async () => { await act(async () => document.body.replaceChildren()); adapter.createHomeAssistantTransport.mockClear(); });

describe("dashhaus-futura", () => {
  it("renders a usable empty Dashboard and reuses one store per connection", async () => {
    const card = document.createElement("dashhaus-futura-test") as Card;
    card.setConfig({ title: "Home" });
    card.hass = { connection, states: {}, themes: { darkMode: false } };
    await act(async () => { document.body.append(card); await Promise.resolve(); });
    expect(card.shadowRoot?.querySelector(".futura-header h1")?.textContent).toBe("Home");
    expect(card.shadowRoot?.querySelector(".futura-dashboard-empty")?.textContent).toContain("No supported entities");
    card.hass = { connection, states: {}, themes: { darkMode: true } };
    expect(adapter.createHomeAssistantTransport).toHaveBeenCalledTimes(1);
  });
});
