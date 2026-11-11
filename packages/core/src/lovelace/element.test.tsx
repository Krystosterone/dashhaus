import { act } from "react";
// The card renders through its own React root, outside testing-library; tell React this is a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "../websocket";
import type { HaTransport, HassEntities } from "../index";
import type { LovelaceHass } from "./element";

const entities: HassEntities = {
  "camera.door": { entity_id: "camera.door", state: "idle", attributes: { friendly_name: "Door" }, last_changed: "", last_updated: "" },
};

/** Every transport a card made, one per store, with its connection and what subscribed to it. */
const transports = vi.hoisted(() => [] as { connection: unknown; subscribed: number; unsubscribed: number }[]);

vi.mock("../websocket", () => ({
  createHomeAssistantTransport: (connection: unknown): HaTransport => {
    const made = { connection, subscribed: 0, unsubscribed: 0 };
    transports.push(made);
    return {
      subscribeEntities(listener) {
        made.subscribed++;
        queueMicrotask(() => listener(entities));
        return () => { made.unsubscribed++; };
      },
      callService: async () => undefined,
    };
  },
}));

const { useHaMoreInfo, useHaEntity, useHaStatus } = await import("../index");
const { LovelaceDashboardElement } = await import("./element");

function Live({ entityId }: { entityId: string }) {
  const open = useHaMoreInfo(entityId);
  return <button type="button" onClick={open}>Live view</button>;
}

class TestCard extends LovelaceDashboardElement<{ entity: string }> {
  protected readonly styles = "";
  protected parse(raw: unknown) { return raw as { entity: string }; }
  protected changed() { return false; }
  protected draw(config: { entity: string }) { return <Live entityId={config.entity} />; }
}
customElements.define("dashhaus-element-test", TestCard);

function Status({ entityId }: { entityId: string }) {
  return <p>{`${useHaStatus()} ${useHaEntity(entityId)?.state ?? "none"}`}</p>;
}

/** A card that says its store's status and one entity's state, as the store has it. */
class StatusCard extends TestCard {
  protected draw(config: { entity: string }) { return <Status entityId={config.entity} />; }
}
customElements.define("dashhaus-element-status-test", StatusCard);

/** Let every queued microtask run: the element's detach check, then the provider's release after it. */
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

/** A card that lays itself out automatically when its config says so, drawing what it holds of the energy preferences. */
class EnergyCard extends LovelaceDashboardElement<{ auto: boolean }> {
  protected readonly styles = "";
  draws = 0;
  protected parse(raw: unknown) { return raw as { auto: boolean }; }
  protected changed() { return false; }
  protected draw(config: { auto: boolean }, hass: LovelaceHass) {
    this.draws++;
    const prefs = config.auto ? this.energyPrefs(hass) : undefined;
    return <p>{prefs ? prefs.energy_sources.map((source) => source.stat_rate).join(",") : "none"}</p>;
  }
  static held(hass: LovelaceHass) { return EnergyCard.heldEnergyPrefs(hass); }
}
customElements.define("dashhaus-element-energy-test", EnergyCard);

const PREFS = { energy_sources: [{ type: "grid", stat_rate: "sensor.grid_power" }] };

/** A connection whose `energy/get_prefs` answers when the test says. */
function energyConnection() {
  let answer!: (value: unknown) => void;
  const sendMessagePromise = vi.fn(() => new Promise((resolve) => { answer = resolve; }));
  return { connection: { sendMessagePromise } as unknown as Connection, sendMessagePromise, answer: (value: unknown) => answer(value) };
}

async function mountEnergy(config: { auto: boolean }, connection: Connection) {
  const card = document.createElement("dashhaus-element-energy-test") as EnergyCard & { hass: unknown };
  card.setConfig(config);
  card.hass = { connection, states: entities };
  await act(async () => {
    document.body.append(card);
    await Promise.resolve();
  });
  return card;
}

afterEach(async () => {
  await act(async () => document.body.replaceChildren());
});

describe("LovelaceDashboardElement", () => {
  it("opens Home Assistant's own more-info dialog for an entity, from inside its shadow root", async () => {
    const card = document.createElement("dashhaus-element-test") as TestCard & { hass: unknown };
    card.setConfig({ entity: "camera.door" });
    card.hass = { connection: {} as Connection, states: entities };
    const heard = vi.fn();
    document.body.addEventListener("hass-more-info", (event) => heard((event as CustomEvent).detail));
    await act(async () => {
      document.body.append(card);
      await Promise.resolve();
    });

    await act(async () => card.shadowRoot!.querySelector("button")!.click());
    expect(heard).toHaveBeenCalledWith({ entityId: "camera.door" });
  });
});

describe("LovelaceDashboardElement's lifecycle", () => {
  async function mountStatus(connection: Connection) {
    const card = document.createElement("dashhaus-element-status-test") as StatusCard & { hass: unknown };
    card.setConfig({ entity: "camera.door" });
    card.hass = { connection, states: entities };
    await act(async () => document.body.append(card));
    await settle();
    return card;
  }

  it("unmounts once it stays detached, and draws again on a connected, subscribed store when it comes back", async () => {
    const connection = {} as Connection;
    const card = await mountStatus(connection);
    const transport = transports.find((made) => made.connection === connection)!;
    expect(card.shadowRoot!.textContent).toBe("connected idle");
    expect(transport).toMatchObject({ subscribed: 1, unsubscribed: 0 });

    card.remove();
    // Detached, it waits a microtask: Lovelace moving a card between parents must not tear it down.
    expect(card.shadowRoot!.textContent).toBe("connected idle");
    await settle();
    expect(card.shadowRoot!.textContent).toBe("");
    expect(transport).toMatchObject({ subscribed: 1, unsubscribed: 1 });

    await act(async () => document.body.append(card));
    await settle();
    expect(card.shadowRoot!.textContent).toBe("connected idle");
    expect(transport).toMatchObject({ subscribed: 2, unsubscribed: 1 });
    expect(transports.filter((made) => made.connection === connection)).toHaveLength(1);
  });

  it("keeps drawing, on the same subscription, when Lovelace moves it to another parent", async () => {
    const connection = {} as Connection;
    const card = await mountStatus(connection);
    const transport = transports.find((made) => made.connection === connection)!;
    const parent = document.createElement("div");
    document.body.append(parent);

    await act(async () => parent.append(card));
    await settle();
    expect(card.shadowRoot!.textContent).toBe("connected idle");
    expect(transport).toMatchObject({ subscribed: 1, unsubscribed: 0 });
  });

  it("swaps to a new store on a new connection, subscribing it and letting the old one go", async () => {
    const first = {} as Connection;
    const card = await mountStatus(first);
    const old = transports.find((made) => made.connection === first)!;

    const second = {} as Connection;
    card.hass = { connection: second, states: entities };
    await settle();
    const next = transports.find((made) => made.connection === second)!;
    expect(next).toMatchObject({ subscribed: 1, unsubscribed: 0 });
    expect(old).toMatchObject({ subscribed: 1, unsubscribed: 1 });
    expect(card.shadowRoot!.textContent).toBe("connected idle");
  });
});

describe("LovelaceDashboardElement's energy preferences", () => {
  it("never reads them until a skin asks, as a page laid out by hand never does", async () => {
    const { connection, sendMessagePromise } = energyConnection();
    const card = await mountEnergy({ auto: false }, connection);
    expect(card.shadowRoot!.textContent).toBe("none");
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });

  it("reads them once per connection, draws again when they land, and shares them with every card on it", async () => {
    const { connection, sendMessagePromise, answer } = energyConnection();
    const card = await mountEnergy({ auto: true }, connection);
    const other = await mountEnergy({ auto: true }, connection);
    expect(card.shadowRoot!.textContent).toBe("none");
    expect(EnergyCard.held({ connection, states: entities })).toBeUndefined();
    const before = card.draws;
    await act(async () => {
      answer(PREFS);
      await Promise.resolve();
    });
    expect(card.draws).toBeGreaterThan(before);
    expect(card.shadowRoot!.textContent).toBe("sensor.grid_power");
    expect(other.shadowRoot!.textContent).toBe("sensor.grid_power");
    expect(sendMessagePromise).toHaveBeenCalledTimes(1);
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: "energy/get_prefs" });
    expect(EnergyCard.held({ connection, states: entities })).toEqual(PREFS);

    await mountEnergy({ auto: true }, connection);
    expect(sendMessagePromise).toHaveBeenCalledTimes(1);
  });

  it("reads them again on a new connection, and holds nothing for good when Home Assistant has none", async () => {
    const first = energyConnection();
    const card = await mountEnergy({ auto: true }, first.connection);
    await act(async () => {
      first.answer(PREFS);
      await Promise.resolve();
    });
    const second = energyConnection();
    card.hass = { connection: second.connection, states: entities };
    await act(async () => Promise.resolve());
    expect(second.sendMessagePromise).toHaveBeenCalledTimes(1);
    await act(async () => {
      second.answer(null);
      await Promise.resolve();
    });
    expect(card.shadowRoot!.textContent).toBe("none");
    expect(EnergyCard.held({ connection: second.connection, states: entities })).toBeUndefined();
  });
});
