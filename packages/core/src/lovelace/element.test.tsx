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

vi.mock("../websocket", () => ({
  createHomeAssistantTransport: (): HaTransport => ({
    subscribeEntities(listener) {
      queueMicrotask(() => listener(entities));
      return () => undefined;
    },
    callService: async () => undefined,
  }),
}));

const { useHaMoreInfo } = await import("../index");
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
