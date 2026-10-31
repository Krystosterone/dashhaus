import { act } from "react";
// The card renders through its own React root, outside testing-library; tell React this is a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "@dashhaus/core/websocket";
import type { HaTransport, HassEntities } from "@dashhaus/core";

const entities: HassEntities = {
  "light.kitchen": { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen", supported_color_modes: ["onoff"] } },
  "light.desk": { entity_id: "light.desk", state: "off", attributes: { friendly_name: "Desk", supported_color_modes: ["brightness"] } },
  "climate.living_room": { entity_id: "climate.living_room", state: "heat", attributes: { friendly_name: "Thermostat", hvac_modes: ["off", "heat"], current_temperature: 20.4, temperature: 21.5 } },
  "sensor.office_temperature": { entity_id: "sensor.office_temperature", state: "21.2", attributes: { friendly_name: "Office air", device_class: "temperature", unit_of_measurement: "°C" } },
  "sensor.office_power": { entity_id: "sensor.office_power", state: "84", attributes: { friendly_name: "Office power", device_class: "power" } },
  "light.hidden": { entity_id: "light.hidden", state: "off", attributes: { friendly_name: "Hidden" } },
  "input_text.note": { entity_id: "input_text.note", state: "", attributes: { friendly_name: "Note" } },
};

const adapter = vi.hoisted(() => ({ createHomeAssistantTransport: vi.fn() }));
vi.mock("@dashhaus/core/websocket", () => adapter);
adapter.createHomeAssistantTransport.mockImplementation((): HaTransport => ({
  subscribeEntities(listener) {
    queueMicrotask(() => listener(entities));
    return () => undefined;
  },
  callService: async () => undefined,
}));

const { createFieldCard } = await import("./card");
const { DashboardConfigError } = await import("@dashhaus/dashboard");

customElements.define("dashhaus-field-test", createFieldCard(":root { --fd-press: 120ms; } :root[data-fd-finish=\"black\"] { --fd-page: #111; }"));
type Card = HTMLElement & { setConfig(raw: unknown): void; hass: unknown };
const Element = customElements.get("dashhaus-field-test") as unknown as { new (): Card; getStubConfig(): Record<string, unknown> };

const connection = {} as Connection;
const hass = (darkMode = false) => ({
  connection,
  states: entities,
  themes: { darkMode },
  entities: {
    "light.kitchen": { device_id: "lamp" },
    "light.desk": { area_id: "office" },
    "climate.living_room": { area_id: "living" },
    "sensor.office_temperature": { area_id: "office" },
    "light.hidden": { hidden: true },
  },
  devices: { lamp: { area_id: "kitchen" } },
  areas: { kitchen: { name: "Kitchen" }, living: { name: "Living room" }, office: { name: "Office" } },
});

async function mount(config: Record<string, unknown>, darkMode = false) {
  const card = document.createElement("dashhaus-field-test") as Card;
  card.setConfig(config);
  card.hass = hass(darkMode);
  await act(async () => {
    document.body.append(card);
    await Promise.resolve();
  });
  return card;
}

const names = (card: Card) => [...card.shadowRoot!.querySelectorAll(".fd-module .fd-open-t")].map((n) => n.textContent);
const legends = (card: Card) => [...card.shadowRoot!.querySelectorAll(".fd-dash-area > .fd-legend")].map((n) => n.textContent);

// jsdom doesn't scroll; the nav's jumps are checked by what they ask to scroll.
beforeEach(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });

afterEach(async () => {
  await act(async () => document.body.replaceChildren());
  history.replaceState(null, "", location.pathname);
  adapter.createHomeAssistantTransport.mockClear();
  document.head.querySelectorAll("link").forEach((l) => l.remove());
});

describe("dashhaus-field card", () => {
  it("draws every visible light, climate entity and room sensor by area, scopes the skin's tokens to the host, and links its font", async () => {
    const card = await mount({ title: "Home" });
    const shadow = card.shadowRoot!;
    expect(shadow.querySelector("style")?.textContent).toContain(":host { --fd-press: 120ms; }");
    expect(shadow.querySelector(".fd-hh-title")?.textContent).toBe("Home");
    expect(shadow.querySelector(".fd-hh-clock")).toBeNull();
    expect(legends(card)).toEqual(["Kitchen", "Living room", "Office"]);
    expect(names(card)).toEqual(["Kitchen", "Thermostat", "Desk", "Office air"]);
    expect(document.head.querySelector("link[href*='family=Archivo']")).not.toBeNull();
  });

  it("draws a clock in the header with show_time, on the hour cycle asked for", async () => {
    const card = await mount({ title: "Home", show_time: true, hour_cycle: "h23" });
    const clock = card.shadowRoot!.querySelector(".fd-hh-clock");
    expect(clock?.textContent).toMatch(/^\d{2}:\d{2}$/);
  });

  it("draws only the configured modules when given, with their own names and areas", async () => {
    const card = await mount({ modules: [{ entity: "light.desk", name: "Desk lamp", area: "Study" }, "light.kitchen"] });
    expect(names(card)).toEqual(["Kitchen", "Desk lamp"]);
    expect(legends(card)).toEqual(["Kitchen", "Study"]);
  });

  it("follows Home Assistant's dark mode with the black finish by default, or takes a fixed one", async () => {
    expect((await mount({}, true)).getAttribute("data-fd-finish")).toBe("black");
    expect((await mount({}, false)).getAttribute("data-fd-finish")).toBe("alloy");
    expect((await mount({ finish: "auto" }, true)).hasAttribute("data-fd-finish")).toBe(false);
  });

  it("keeps one store per connection as hass updates", async () => {
    const card = await mount({});
    card.hass = hass();
    card.hass = hass();
    expect(adapter.createHomeAssistantTransport).toHaveBeenCalledTimes(1);
  });

  it("throws every config problem for the YAML editor to show", () => {
    const card = document.createElement("dashhaus-field-test") as Card;
    expect(() => card.setConfig({ modules: [{ entity: "light.a", footprnt: "compact" }] })).toThrow('did you mean "footprint"?');
    expect(() => card.setConfig({ modules: ["input_text.note"] })).toThrow(DashboardConfigError);
    expect(() => card.setConfig({ modules: ["input_text.note"] })).toThrow(/input_text\.note must be a light\.\* or .* entity/);
  });

  it("lays out its own sections, a note at a legend's end, and docks a nav to them", async () => {
    const card = await mount({
      title: "Home",
      subtitle: "Everyone home",
      sections: [
        { title: "Quick", note: "Pressed most", modules: ["light.kitchen", { entity: "light.desk", span: 2 }] },
        { columns: 2, sections: [{ title: "Comfort", modules: ["climate.living_room"] }, { title: "Air", modules: ["sensor.office_temperature"] }] },
      ],
    });
    const shadow = card.shadowRoot!;
    expect(shadow.querySelector(".fd-hh-sub")?.textContent).toBe("Everyone home");
    expect(legends(card)).toEqual(["QuickPressed most", "Comfort", "Air"]);
    expect([...shadow.querySelectorAll("[data-section-id]")].map((s) => s.id)).toEqual(["section-quick", "section-comfort", "section-air"]);
    expect(shadow.querySelector(".fd-dash-cell[data-span='2'] .fd-open-t")?.textContent).toBe("Desk");
    // The plate names the module's own area, from the registries, whatever its section is called.
    expect(shadow.querySelector(".fd-dash-cell .fd-area")?.textContent).toBe("Office");
    const keys = [...shadow.querySelectorAll<HTMLButtonElement>(".fd-nav-key")];
    expect(keys.map((k) => k.textContent)).toEqual(["Quick", "Comfort", "Air"]);
    await act(async () => keys[2].click());
    expect(shadow.querySelector("#section-air")!.scrollIntoView).toHaveBeenCalled();
    expect(keys[2].getAttribute("aria-current")).toBe("location");
  });

  it("lists the areas in the automatic layout's nav, and draws none with nav: false", async () => {
    const auto = await mount({});
    expect([...auto.shadowRoot!.querySelectorAll(".fd-nav-key")].map((k) => k.textContent)).toEqual(["Kitchen", "Living room", "Office"]);
    const off = await mount({ nav: false });
    expect(off.shadowRoot!.querySelector(".fd-nav")).toBeNull();
  });

  it("opens a page of its own from the nav, its title heading the page", async () => {
    const card = await mount({
      title: "Home",
      modules: ["light.kitchen"],
      pages: [{ id: "office", title: "Office", sections: [{ title: "Desk", modules: ["light.desk", "sensor.office_temperature"] }] }],
    });
    const shadow = card.shadowRoot!;
    const keys = () => [...shadow.querySelectorAll<HTMLButtonElement>(".fd-nav-key")];
    expect(keys().map((k) => [k.textContent, k.getAttribute("aria-current")])).toEqual([["Home", "page"], ["Office", null]]);
    await act(async () => keys()[1].click());
    expect(shadow.querySelector(".fd-hh-title")?.textContent).toBe("Office");
    expect(names(card)).toEqual(["Desk", "Office air"]);
    expect(location.hash).toBe("#page=office");
    await act(async () => keys()[0].click());
    expect(names(card)).toEqual(["Kitchen"]);
  });

  it("sets a wall panel for distance, with no nav unless its YAML lists one", async () => {
    const far = await mount({ viewing: "far" });
    expect(far.shadowRoot!.querySelector(".fd-dash")?.getAttribute("data-viewing")).toBe("far");
    expect(far.shadowRoot!.querySelector(".fd-nav")).toBeNull();
    const listed = await mount({ viewing: "far", nav: [{ section: "Kitchen" }, { section: "Office" }] });
    expect([...listed.shadowRoot!.querySelectorAll(".fd-nav-key")].map((k) => k.textContent)).toEqual(["Kitchen", "Office"]);
  });

  it("reads temperatures in the unit asked for", async () => {
    const card = await mount({ modules: [{ entity: "climate.living_room", unit: "°F" }] });
    expect(card.shadowRoot!.querySelector(".fd-read")?.textContent).toContain("°F");
  });

  it("pre-fills the card picker in automatic mode", () => {
    expect(Element.getStubConfig()).toEqual({ type: "custom:dashhaus-field" });
  });
});
