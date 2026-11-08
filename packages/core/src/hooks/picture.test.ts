import { describe, expect, it } from "vitest";
import { NO_PICTURE, nextRefreshIn, pictureReducer, refreshUrl } from "./picture";
import type { PictureModel } from "./picture";

const door = "/api/camera_proxy/camera.door?token=a";

describe("pictureReducer", () => {
  it("loads a source, then shows its frame", () => {
    const asked = pictureReducer(NO_PICTURE, { type: "source", source: door });
    expect(asked).toEqual({ source: door, frame: undefined, status: "loading" });

    const shown = pictureReducer(asked, { type: "loaded", source: door, src: `${door}&t=1`, at: 1 });
    expect(shown).toEqual({ source: door, frame: { src: `${door}&t=1`, at: 1, source: door }, status: "ready", settledAt: 1 });
  });

  it("keeps the last frame up while a new source loads", () => {
    const shown: PictureModel = { source: "a.jpg", frame: { src: "a.jpg", at: 1, source: "a.jpg" }, status: "ready", settledAt: 1 };
    expect(pictureReducer(shown, { type: "source", source: "b.jpg" })).toEqual({ source: "b.jpg", frame: shown.frame, status: "loading" });
  });

  it("keeps a frame of the same source when a refresh fails, as stale", () => {
    const shown: PictureModel = { source: door, frame: { src: door, at: 1, source: door }, status: "ready", settledAt: 1 };
    expect(pictureReducer(shown, { type: "failed", source: door, at: 9 })).toEqual({ ...shown, status: "stale", settledAt: 9 });
  });

  it("drops another source's frame when the new source fails, so the last track's cover never sits under the next", () => {
    const loading: PictureModel = { source: "b.jpg", frame: { src: "a.jpg", at: 1, source: "a.jpg" }, status: "loading" };
    expect(pictureReducer(loading, { type: "failed", source: "b.jpg", at: 9 })).toEqual({ source: "b.jpg", status: "failed", settledAt: 9 });
  });

  it("clears everything with no source", () => {
    const shown: PictureModel = { source: door, frame: { src: door, at: 1, source: door }, status: "ready", settledAt: 1 };
    expect(pictureReducer(shown, { type: "source" })).toBe(NO_PICTURE);
    expect(pictureReducer(NO_PICTURE, { type: "source" })).toBe(NO_PICTURE);
  });

  it("ignores a load that settles for a source no longer asked for", () => {
    const loading: PictureModel = { source: "b.jpg", status: "loading" };
    expect(pictureReducer(loading, { type: "loaded", source: "a.jpg", src: "a.jpg", at: 2 })).toBe(loading);
    expect(pictureReducer(loading, { type: "failed", source: "a.jpg", at: 2 })).toBe(loading);
    expect(pictureReducer(loading, { type: "source", source: "b.jpg" })).toBe(loading);
  });
});

describe("refreshUrl", () => {
  it("adds the time, so no cache answers with the frame already shown", () => {
    expect(refreshUrl(door, 1730970000000)).toBe(`${door}&t=1730970000000`);
    expect(refreshUrl("http://ha.local/api/camera_proxy/camera.door", 5)).toBe("http://ha.local/api/camera_proxy/camera.door?t=5");
    expect(refreshUrl("/still.jpg?a=1#crop", 5)).toBe("/still.jpg?a=1&t=5#crop");
  });

  it("leaves an inline or blob URL alone: a demo still is a still", () => {
    expect(refreshUrl("data:image/svg+xml,%3Csvg%2F%3E", 5)).toBe("data:image/svg+xml,%3Csvg%2F%3E");
    expect(refreshUrl("blob:http://ha.local/1f2e", 5)).toBe("blob:http://ha.local/1f2e");
  });
});

describe("nextRefreshIn", () => {
  it("counts what is left of the interval since the last load settled", () => {
    expect(nextRefreshIn(10_000, 1_000, 4_000)).toBe(7_000);
    expect(nextRefreshIn(10_000, 1_000, 30_000)).toBe(0);
  });

  it("is none without a refresh, or before a first load has settled", () => {
    expect(nextRefreshIn(undefined, 1_000, 4_000)).toBeUndefined();
    expect(nextRefreshIn(0, 1_000, 4_000)).toBeUndefined();
    expect(nextRefreshIn(10_000, undefined, 4_000)).toBeUndefined();
  });
});
