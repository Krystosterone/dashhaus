import { describe, expect, it } from "vitest";
import { againstBase, picturePath, resolvePicture } from "./picture";
import type { HassEntity } from "./types";

const entity = (state: string, entity_picture?: unknown): HassEntity => ({
  entity_id: "camera.door",
  state,
  attributes: entity_picture === undefined ? {} : { entity_picture },
  last_changed: "2026-11-07T10:00:00Z",
  last_updated: "2026-11-07T10:00:00Z",
});

describe("picturePath", () => {
  it("reads the entity's own entity_picture", () => {
    expect(picturePath(entity("idle", "/api/camera_proxy/camera.door?token=abc"))).toBe("/api/camera_proxy/camera.door?token=abc");
  });

  it("is nothing while the entity is missing, unavailable or unknown, so a past frame never reads as now", () => {
    expect(picturePath(undefined)).toBeUndefined();
    expect(picturePath(entity("unavailable", "/api/camera_proxy/camera.door?token=abc"))).toBeUndefined();
    expect(picturePath(entity("unknown", "/api/camera_proxy/camera.door?token=abc"))).toBeUndefined();
  });

  it("is nothing when the entity names none, or names something that isn't a path", () => {
    expect(picturePath(entity("idle"))).toBeUndefined();
    expect(picturePath(entity("idle", ""))).toBeUndefined();
    expect(picturePath(entity("idle", 42))).toBeUndefined();
  });
});

describe("resolvePicture", () => {
  const base = (path: string) => againstBase(path, "http://ha.local:8123");

  it("resolves a Home Assistant path through the transport", () => {
    expect(resolvePicture("/api/media_player_proxy/media_player.kitchen?token=t&cache=9f", base)).toBe("http://ha.local:8123/api/media_player_proxy/media_player.kitchen?token=t&cache=9f");
  });

  it("keeps an absolute http(s) URL, as a player whose artwork is remotely accessible gives it", () => {
    expect(resolvePicture("https://i.scdn.co/image/ab67", base)).toBe("https://i.scdn.co/image/ab67");
    expect(resolvePicture("https://i.scdn.co/image/ab67")).toBe("https://i.scdn.co/image/ab67");
  });

  it("keeps an inline image or a blob without asking the transport", () => {
    const never = () => { throw new Error("asked"); };
    expect(resolvePicture("data:image/svg+xml,%3Csvg%2F%3E", never)).toBe("data:image/svg+xml,%3Csvg%2F%3E");
    expect(resolvePicture("data:image/jpeg;base64,AAAA", never)).toBe("data:image/jpeg;base64,AAAA");
    expect(resolvePicture("blob:http://ha.local/1f2e", never)).toBe("blob:http://ha.local/1f2e");
  });

  it("stays relative to the page with no transport resolver", () => {
    expect(resolvePicture("/api/camera_proxy/camera.door?token=abc")).toBe("/api/camera_proxy/camera.door?token=abc");
  });

  it("is nothing for what a page must not load as a picture", () => {
    expect(resolvePicture(undefined, base)).toBeUndefined();
    expect(resolvePicture("javascript:alert(1)", base)).toBeUndefined();
    expect(resolvePicture("JavaScript:alert(1)")).toBeUndefined();
    expect(resolvePicture("data:text/html,<script>1</script>", base)).toBeUndefined();
    expect(resolvePicture("file:///etc/passwd")).toBeUndefined();
    expect(resolvePicture("//evil.example/x.png")).toBeUndefined();
    expect(resolvePicture("relative/x.png")).toBeUndefined();
  });

  it("is nothing when the transport can't resolve the path, as a demo transport that doesn't hold it", () => {
    expect(resolvePicture("/api/camera_proxy/camera.elsewhere", () => undefined)).toBeUndefined();
    expect(resolvePicture("/x", () => "javascript:alert(1)")).toBeUndefined();
    expect(resolvePicture("/x", () => "//evil.example/x")).toBeUndefined();
  });
});

describe("againstBase", () => {
  it("joins a path to the base, and leaves it alone without one", () => {
    expect(againstBase("/api/x", "https://ha.example.com/")).toBe("https://ha.example.com/api/x");
    expect(againstBase("/api/x", undefined)).toBe("/api/x");
  });

  it("is nothing for a base that isn't a URL", () => {
    expect(againstBase("/api/x", "not a url")).toBeUndefined();
  });
});
