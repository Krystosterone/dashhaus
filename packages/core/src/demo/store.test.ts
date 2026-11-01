import { describe, expect, it } from "vitest";
import { createDemoSensorHaTransport } from "../demo";
import { createDemoStore } from "./store";

describe("createDemoStore", () => {
  it("connects the whole demo house to a real store", async () => {
    const store = createDemoStore();

    await store.connect();

    expect(store.getSnapshot().status).toBe("connected");
    expect(store.getSnapshot().entities["light.living_room"]).toMatchObject({ state: "on" });
    expect(store.getSnapshot().entities["climate.living_room"]).toBeDefined();
    store.disconnect();
  });

  it("takes a focused demo transport", async () => {
    const store = createDemoStore(createDemoSensorHaTransport());

    await store.connect();

    expect(Object.keys(store.getSnapshot().entities)).toContain("sensor.living_room_temperature");
    store.disconnect();
  });
});
