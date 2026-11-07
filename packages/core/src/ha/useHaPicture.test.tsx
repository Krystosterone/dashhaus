import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useHaMoreInfo, useHaPicture } from "./useHaPicture";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HassEntities, HaTransport } from "./types";
import { fakeTransport } from "../testing";

const stamp = "2026-11-07T10:00:00Z";
const raw: HassEntities = {
  "camera.door": {
    entity_id: "camera.door",
    state: "idle",
    attributes: { friendly_name: "Door", entity_picture: "/api/camera_proxy/camera.door?token=one" },
    last_changed: stamp,
    last_updated: stamp,
  },
};

function setup(resolveUrl?: HaTransport["resolveUrl"], moreInfo?: (entityId: string) => void) {
  const fake = fakeTransport(raw);
  const transport: HaTransport = resolveUrl ? { ...fake.transport, resolveUrl } : fake.transport;
  const store = createHaStore(transport);
  const wrapper = ({ children }: { children: ReactNode }) => <HaProvider store={store} moreInfo={moreInfo}>{children}</HaProvider>;
  return { ...fake, wrapper };
}

describe("useHaPicture", () => {
  it("resolves the entity's picture through the transport, and follows the attribute as its token rotates", async () => {
    const { wrapper, emitEntity } = setup((path) => `http://ha.local:8123${path}`);
    const { result } = renderHook(() => useHaPicture("camera.door"), { wrapper });

    await waitFor(() => expect(result.current).toBe("http://ha.local:8123/api/camera_proxy/camera.door?token=one"));
    act(() => emitEntity("camera.door", { attributes: { entity_picture: "/api/camera_proxy/camera.door?token=two" } }));
    expect(result.current).toBe("http://ha.local:8123/api/camera_proxy/camera.door?token=two");
  });

  it("keeps the path relative to the page when the transport has no resolver", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useHaPicture("camera.door"), { wrapper });

    await waitFor(() => expect(result.current).toBe("/api/camera_proxy/camera.door?token=one"));
  });

  it("drops the picture while the entity is unavailable, and for a missing entity or none asked", async () => {
    const { wrapper, emitEntity } = setup((path) => `http://ha.local${path}`);
    const { result } = renderHook(() => useHaPicture("camera.door"), { wrapper });
    await waitFor(() => expect(result.current).toBeDefined());

    act(() => emitEntity("camera.door", { state: "unavailable" }));
    expect(result.current).toBeUndefined();
    expect(renderHook(() => useHaPicture("camera.elsewhere"), { wrapper }).result.current).toBeUndefined();
    expect(renderHook(() => useHaPicture(undefined), { wrapper }).result.current).toBeUndefined();
  });

  it("is nothing where the transport can't resolve the path, as a demo transport that doesn't hold it", async () => {
    const { wrapper } = setup(() => undefined);
    const { result } = renderHook(() => useHaPicture("camera.door"), { wrapper });
    await act(async () => { await Promise.resolve(); });

    expect(result.current).toBeUndefined();
  });
});

describe("useHaMoreInfo", () => {
  it("opens the host's dialog for the entity", () => {
    const moreInfo = vi.fn();
    const { wrapper } = setup(undefined, moreInfo);
    const { result } = renderHook(() => useHaMoreInfo("camera.door"), { wrapper });

    result.current?.();
    expect(moreInfo).toHaveBeenCalledWith("camera.door");
  });

  it("is nothing where the host has no dialog, so a card falls back to its own details", () => {
    const { wrapper } = setup();
    expect(renderHook(() => useHaMoreInfo("camera.door"), { wrapper }).result.current).toBeUndefined();
    const withHost = setup(undefined, vi.fn());
    expect(renderHook(() => useHaMoreInfo(undefined), { wrapper: withHost.wrapper }).result.current).toBeUndefined();
  });
});
