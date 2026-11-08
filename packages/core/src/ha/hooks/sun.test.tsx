import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useHaSun } from "./sun";
import { HaProvider } from "../provider";
import { createHaStore } from "../store";
import { createDemoSunHaTransport } from "../../demo/sun";
import type { HaTransport } from "../types";

function setup(transport: HaTransport = createDemoSunHaTransport()) {
  const store = createHaStore(transport);
  const wrapper = ({ children }: { children: ReactNode }) => <HaProvider store={store}>{children}</HaProvider>;
  return { wrapper };
}

describe("useHaSun", () => {
  it("maps the sun, and draws today's path from Home Assistant's location", async () => {
    const transport = createDemoSunHaTransport();
    const ask = vi.spyOn(transport, "sendMessage");
    const { wrapper } = setup(transport);
    const { result } = renderHook(() => useHaSun("sun.sun"), { wrapper });
    await waitFor(() => expect(result.current.history).toBeDefined());
    expect(result.current.entity).toMatchObject({ name: "Sun", state: "ok" });
    expect(result.current.entity.nextSetting).toBeGreaterThan(result.current.entity.now);
    expect(result.current.history?.path.length).toBeGreaterThan(100);
    expect(ask).toHaveBeenCalledWith("get_config", expect.anything());
  });

  it("takes the location from its options without asking, and leaves the path out with loadHistory: false", async () => {
    const transport = createDemoSunHaTransport();
    const ask = vi.spyOn(transport, "sendMessage");
    const { wrapper } = setup(transport);
    const given = renderHook(() => useHaSun("sun.sun", { latitude: 78.2, longitude: 15.6 }), { wrapper });
    await waitFor(() => expect(given.result.current.entity.state).toBe("ok"));
    expect(given.result.current.history?.peak).toBeLessThan(35);
    expect(ask).not.toHaveBeenCalledWith("get_config", expect.anything());

    const none = renderHook(() => useHaSun("sun.sun", { loadHistory: false }), { wrapper });
    await waitFor(() => expect(none.result.current.entity.state).toBe("ok"));
    expect(none.result.current.history).toBeUndefined();
  });

  it("draws no path where the location can't be read", async () => {
    const transport = createDemoSunHaTransport();
    transport.sendMessage = () => Promise.reject(new Error("no"));
    const { wrapper } = setup(transport);
    const { result } = renderHook(() => useHaSun("sun.sun"), { wrapper });
    await waitFor(() => expect(result.current.entity.state).toBe("ok"));
    expect(result.current.history).toBeUndefined();
  });
});
