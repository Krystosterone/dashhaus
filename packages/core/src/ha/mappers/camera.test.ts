import { describe, expect, it } from "vitest";
import { cameraFromHass } from "./camera";

const raw = {
  entity_id: "camera.front_door",
  state: "idle",
  attributes: {
    friendly_name: "Front door",
    access_token: "secret",
    entity_picture: "/api/camera_proxy/camera.front_door?token=secret",
    brand: "Reolink",
    model_name: "Video Doorbell",
    motion_detection: true,
    frontend_stream_type: "hls",
    supported_features: 2,
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
};

describe("cameraFromHass", () => {
  it("maps identity, its state, what it is and since when", () => {
    const mapped = cameraFromHass(raw, raw.entity_id, { area: "Porch" });
    expect(mapped).toMatchObject({ entityId: "camera.front_door", name: "Front door", area: "Porch", state: "idle", brand: "Reolink", model: "Video Doorbell", motionDetection: true });
    expect(mapped.lastChanged).toBeDefined();
  });

  it("never reads the picture or its token: the still is the hook's, not the model's", () => {
    const mapped = cameraFromHass(raw, raw.entity_id);
    expect(mapped.picture).toBeUndefined();
    expect(JSON.stringify(mapped)).not.toContain("secret");
  });

  it("keeps each of Home Assistant's states", () => {
    for (const state of ["idle", "recording", "streaming"]) expect(cameraFromHass({ ...raw, state }, raw.entity_id).state).toBe(state);
  });

  it("keeps unknown, unavailable, and missing entities unavailable, with nothing it last said", () => {
    for (const state of ["unknown", "unavailable", ""]) {
      expect(cameraFromHass({ ...raw, state }, raw.entity_id)).toMatchObject({ state: "unavailable", motionDetection: undefined, lastChanged: undefined });
    }
    expect(cameraFromHass(undefined, "camera.missing")).toMatchObject({ name: "camera.missing", state: "unavailable" });
  });

  it("says a state Home Assistant doesn't name in its own words, never as idle", () => {
    expect(cameraFromHass({ ...raw, state: "motion_alert" }, raw.entity_id)).toMatchObject({ state: "other", stateText: "Motion alert" });
  });

  it("takes motion detection only as Home Assistant's boolean", () => {
    expect(cameraFromHass({ ...raw, attributes: { ...raw.attributes, motion_detection: "on" } }, raw.entity_id).motionDetection).toBeUndefined();
  });

  it("sets lastSeen only when unavailable", () => {
    expect(cameraFromHass(raw, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBeUndefined();
    expect(cameraFromHass({ ...raw, state: "unavailable" }, raw.entity_id, { lastSeen: "07:00" }).lastSeen).toBe("07:00");
  });

  it("rejects impossible state timestamps", () => {
    expect(cameraFromHass({ ...raw, last_changed: "2026-02-31T10:00:00Z" }, raw.entity_id).lastChanged).toBeUndefined();
  });
});
