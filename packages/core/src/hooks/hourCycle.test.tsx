import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { hourCycleOf } from "../entities/clock";
import { HourCycleProvider, useHourCycle } from "./hourCycle";

describe("useHourCycle", () => {
  it("is the browser locale's outside any provider", () => {
    const { result } = renderHook(() => useHourCycle());
    expect(result.current).toBe(hourCycleOf());
  });

  it("is the dashboard's under its provider, whatever the locale", () => {
    for (const cycle of ["h12", "h23"] as const) {
      const wrapper = ({ children }: { children: ReactNode }) => <HourCycleProvider hourCycle={cycle}>{children}</HourCycleProvider>;
      expect(renderHook(() => useHourCycle(), { wrapper }).result.current).toBe(cycle);
    }
  });

  it("takes a header's own cycle, then its locale's, over the one around it", () => {
    const wrapper = ({ children }: { children: ReactNode }) => <HourCycleProvider hourCycle="h12">{children}</HourCycleProvider>;
    expect(renderHook(() => useHourCycle({ hourCycle: "h23" }), { wrapper }).result.current).toBe("h23");
    expect(renderHook(() => useHourCycle({ locale: "de-DE" }), { wrapper }).result.current).toBe("h23");
    expect(renderHook(() => useHourCycle(), { wrapper }).result.current).toBe("h12");
  });

  it("keeps the cycle around it when a page sets none", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <HourCycleProvider hourCycle="h12"><HourCycleProvider>{children}</HourCycleProvider></HourCycleProvider>
    );
    expect(renderHook(() => useHourCycle(), { wrapper }).result.current).toBe("h12");
  });
});
