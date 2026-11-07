import { act } from "react";
// The card renders through its own React root, outside testing-library; tell React this is a test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "../websocket";
import type { HaTransport, HassEntities } from "../index";

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
