import { describe, expect, it, vi } from "vitest";
import { COVER_ACTIONS, createCoverHandlers } from "./cover";
import { CLASS_LABEL, isAccess } from "../../entities/cover/position";
import type { CoverClass } from "../../entities/cover/types";
import { coverFromHass } from "../mappers/cover";
import type { CoverEntity } from "../../entities/cover/types";

const entity: CoverEntity = {
  entityId: "cover.living_room",
  name: "Living room blinds",
  state: "open",
  deviceClass: "blind",
  position: 100,
  tilt: 50,
  supportsPosition: true,
  supportsStop: true,
  supportsTilt: true,
};

describe("createCoverHandlers", () => {
  it("builds native cover service payloads", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createCoverHandlers({ callService }, entity);

    handlers.onOpenCover();
    handlers.onCloseCover();
    handlers.onStopCover();
    handlers.onSetPosition?.(30);
    handlers.onSetTilt?.(70);
    await Promise.resolve();

    expect(callService).toHaveBeenNthCalledWith(1, "cover", "open_cover", { entity_id: "cover.living_room" });
    expect(callService).toHaveBeenNthCalledWith(2, "cover", "close_cover", { entity_id: "cover.living_room" });
    expect(callService).toHaveBeenNthCalledWith(3, "cover", "stop_cover", { entity_id: "cover.living_room" });
    expect(callService).toHaveBeenNthCalledWith(4, "cover", "set_cover_position", { entity_id: "cover.living_room", position: 30 });
    expect(callService).toHaveBeenNthCalledWith(5, "cover", "set_cover_tilt_position", { entity_id: "cover.living_room", tilt_position: 70 });
  });

  it("does not expose unsupported position and tilt actions", () => {
    const handlers = createCoverHandlers({ callService: vi.fn(async () => undefined) }, { ...entity, supportsPosition: false, supportsTilt: false });
    expect(handlers.onSetPosition).toBeUndefined();
    expect(handlers.onSetTilt).toBeUndefined();
  });

  it("reports stopping as unsupported when the cover cannot stop", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createCoverHandlers({ callService }, { ...entity, supportsStop: false }, { onError });

    handlers.onStopCover();

    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported" }));
  });

  it("opens and closes a cover by the first way it declares, never a service it lacks", async () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const raw = (supported_features: number) => coverFromHass({
      entity_id: "cover.slats", state: "closed", attributes: { device_class: "blind", supported_features },
      last_changed: "2026-10-19T10:00:00Z", last_updated: "2026-10-19T10:00:00Z",
    }, "cover.slats");
    // Position only; slats that tilt on their own services and stop; slats with a tilt position only; nothing at all.
    for (const features of [4, 16 | 32 | 64, 128, 0]) {
      const handlers = createCoverHandlers({ callService }, raw(features), { onError });
      handlers.onOpenCover();
      handlers.onCloseCover();
      handlers.onStopCover();
    }
    await Promise.resolve();

    const sent = callService.mock.calls.map((call) => call as unknown as [string, string, Record<string, unknown>]);
    expect(sent.map(([, service, data]) => [service, data.position ?? data.tilt_position])).toEqual([
      ["set_cover_position", 100], ["set_cover_position", 0],
      ["open_cover_tilt", undefined], ["close_cover_tilt", undefined], ["stop_cover_tilt", undefined],
      ["set_cover_tilt_position", 100], ["set_cover_tilt_position", 0],
    ]);
    // Position only can't stop; slats with a tilt position only can't; nothing at all can do none of the three.
    expect(onError.mock.calls.map(([error]) => (error as { message: string }).message)).toEqual([
      "cover.slats does not support stopping",
      "cover.slats does not support stopping",
      "cover.slats does not support opening",
      "cover.slats does not support closing",
      "cover.slats does not support stopping",
    ]);
  });

  it("drives a cover Home Assistant reports as unknown", async () => {
    // A Somfy RTS blind on an assumed state: no position, but it opens, closes and stops.
    const rts = coverFromHass({
      entity_id: "cover.rts",
      state: "unknown",
      attributes: { friendly_name: "RTS blind", device_class: "blind", assumed_state: true, supported_features: 1 | 2 | 8 },
      last_changed: "2026-10-19T10:00:00Z",
      last_updated: "2026-10-19T10:00:00Z",
    }, "cover.rts");
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createCoverHandlers({ callService }, rts, { onError });

    handlers.onOpenCover();
    handlers.onCloseCover();
    handlers.onStopCover();
    await Promise.resolve();

    expect(onError).not.toHaveBeenCalled();
    expect(callService.mock.calls).toEqual([
      ["cover", "open_cover", { entity_id: "cover.rts" }],
      ["cover", "close_cover", { entity_id: "cover.rts" }],
      ["cover", "stop_cover", { entity_id: "cover.rts" }],
    ]);
  });

  it("reports unavailable covers as unsupported without calling services", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createCoverHandlers({ callService }, { ...entity, state: "unavailable" }, { onError });

    handlers.onOpenCover();
    handlers.onCloseCover();
    handlers.onStopCover();
    handlers.onSetPosition?.(50);
    handlers.onSetTilt?.(50);

    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(5);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported" }));
  });

  it("clamps bounded percentages and rejects non-finite inputs before transport", async () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createCoverHandlers({ callService }, entity, { onError });

    handlers.onSetPosition?.(Number.NaN);
    handlers.onSetPosition?.(-1);
    handlers.onSetPosition?.(101);
    handlers.onSetTilt?.(Number.POSITIVE_INFINITY);
    handlers.onSetTilt?.(200);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenNthCalledWith(1, expect.objectContaining({ code: "invalid_input" }));
    expect(onError).toHaveBeenNthCalledWith(2, expect.objectContaining({ code: "invalid_input" }));
    expect(callService).toHaveBeenNthCalledWith(1, "cover", "set_cover_position", { entity_id: "cover.living_room", position: 0 });
    expect(callService).toHaveBeenNthCalledWith(2, "cover", "set_cover_position", { entity_id: "cover.living_room", position: 100 });
    expect(callService).toHaveBeenNthCalledWith(3, "cover", "set_cover_tilt_position", { entity_id: "cover.living_room", tilt_position: 100 });
  });

  it("reports rejected actions without swallowing the error at the boundary", async () => {
    const failure = new Error("denied");
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw failure; });
    const handlers = createCoverHandlers({ callService }, entity, { onError });

    handlers.onOpenCover();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed" }));
  });
});

describe("COVER_ACTIONS", () => {
  it("asks first to open, close or set a garage door, door or gate: exactly the classes isAccess names; stopping never asks", () => {
    const access = (Object.keys(CLASS_LABEL) as CoverClass[]).filter(isAccess);
    for (const action of [COVER_ACTIONS.onOpenCover, COVER_ACTIONS.onCloseCover, COVER_ACTIONS.onSetPosition]) {
      expect(action.asks).toBe(true);
      expect([...action.when.deviceClass].sort()).toEqual([...access].sort());
    }
    expect(COVER_ACTIONS.onStopCover).toEqual({ takes: "nothing" });
    expect(COVER_ACTIONS.onSetTilt).toEqual({ takes: "level", field: "tilt" });
  });
});
