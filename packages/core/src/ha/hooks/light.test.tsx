import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useHaLight } from "./light";
import { HaProvider } from "../provider";
import { createHaStore } from "../store";
import type { HassEntities } from "../types";
import { fakeTransport } from "../../testing";
import type { LightHistory } from "../../entities/light/types";

const raw: HassEntities = {
  "light.desk": {
    entity_id: "light.desk",
    state: "off",
    attributes: { friendly_name: "Desk", supported_color_modes: ["brightness"] },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

function setup() {
  const { transport, callService } = fakeTransport(raw);
  const store = createHaStore(transport);
  const wrapper = ({ children }: { children: ReactNode }) => <HaProvider store={store}>{children}</HaProvider>;
  return { callService, wrapper };
}

describe("useHaLight", () => {
  it("gives a UI the mapped entity and actions without any tile", async () => {
    const { callService, wrapper } = setup();
    const { result } = renderHook(() => useHaLight("light.desk", { loadHistory: false }), { wrapper });

    await waitFor(() => expect(result.current.entity.state).toBe("off"));
    expect(result.current.entity.name).toBe("Desk");
    expect(result.current.entity.supportsBrightness).toBe(true);

    await act(async () => {
      result.current.actions.onBrightnessChange(40);
      await Promise.resolve();
    });
    expect(callService).toHaveBeenCalledWith("light", "turn_on", { entity_id: "light.desk", brightness_pct: 40 });
  });

  it("returns the host's history in place of the Home Assistant read", async () => {
    const { wrapper } = setup();
    const history: LightHistory = { samples: [0, 1], currentHour: 1, onMinutes: 30 };
    const { result } = renderHook(() => useHaLight("light.desk", { history }), { wrapper });
    await waitFor(() => expect(result.current.entity.name).toBe("Desk"));
    expect(result.current.history).toBe(history);
  });
});
