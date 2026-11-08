import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DysonModule } from "./DysonModule";
import { DYSON_SEEDS } from "@dashhaus/core/seeds/dyson";

/*
 * What every field module does, whatever it is: its keys (a control's; a reading has none) press, a lit LED says on,
 * what asks first never acts on one press, and unavailable blanks the screen and lays every key flat, still focusable
 * so a hold opens the details (spec/field.md → Unavailable). The frame (footprints, details) is ModuleFrame's, tested
 * in shared/ui.test.tsx; test what this dyson itself does here.
 */
const draw = (seed: keyof typeof DYSON_SEEDS, footprint?: "compact" | "standard") => {
  const handlers = { onToggle: vi.fn() };
  const { container } = render(<DysonModule entity={DYSON_SEEDS[seed].entity} footprint={footprint} {...handlers} />);
  return { container, handlers, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-module .fd-key")] };
};

describe("DysonModule", () => {
  it("presses each of its keys once, lights a latching key's LED while it's on, and never acts on what asks first", () => {
    const { container, keys, handlers } = draw("on");
    const on = container.querySelector(".fd-module")?.getAttribute("data-state") === "on";
    expect(keys.length).toBe(Object.keys(handlers).length);
    for (const key of keys) {
      if (key.hasAttribute("aria-pressed")) expect(key.getAttribute("aria-pressed")).toBe(String(on));
      fireEvent.click(key);
    }
    expect(handlers.onToggle).toHaveBeenCalledTimes(1);
  });

  it("blanks the screen while unavailable, says when it was last seen, and lays every key flat with no state word", () => {
    const { container, keys, handlers } = draw("unavailable");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
    // Flat, not disabled: it keeps its focus and its hold, so the details still open; a press does nothing.
    for (const key of keys) {
      expect(key.disabled).toBe(false);
      expect(key.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(key);
    }
    for (const handler of Object.values(handlers)) expect(handler).not.toHaveBeenCalled();
    expect(container.querySelector(".fd-key-cap")).toBeNull();
  });

  it("leads a compact row with its key, or a reading's glyph", () => {
    expect(draw("on", "compact").container.querySelector(".fd-module > .fd-key, .fd-module > .fd-glyph")).not.toBeNull();
  });
});

describe("DysonModule, the Dyson's own", () => {
  const all = () => ({
    onToggle: vi.fn(), onPercentageChange: vi.fn(), onAutoChange: vi.fn(), onOscillateChange: vi.fn(), onOscillationModeChange: vi.fn(),
    onDirectionChange: vi.fn(), onNightModeChange: vi.fn(), onHeatChange: vi.fn(), onHeatTargetChange: vi.fn(),
  });

  it("says its step out of ten, AUTO or OFF on the screen, then the air or what it runs as", () => {
    const { container, rerender } = render(<DysonModule entity={{ ...DYSON_SEEDS.on.entity, oscillating: false }} {...all()} />);
    expect(container.querySelector(".fd-read")?.textContent).toContain("of 10");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Air good/);
    rerender(<DysonModule entity={DYSON_SEEDS.heating.entity} {...all()} />);
    expect(container.querySelector(".fd-read")?.textContent).toBe("AUTO");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Heat 23°/);
    rerender(<DysonModule entity={DYSON_SEEDS.off.entity} {...all()} />);
    expect(container.querySelector(".fd-read")?.textContent).toBe("OFF");
  });

  it("leads with poor air, then a worn filter, behind the warning marker", () => {
    const { container, rerender } = render(<DysonModule entity={DYSON_SEEDS.poorAir.entity} {...all()} />);
    expect(container.querySelector(".fd-meta")?.textContent).toContain("Poor air");
    rerender(<DysonModule entity={DYSON_SEEDS.filter.entity} footprint="compact" {...all()} />);
    expect(container.textContent).toContain("Change filter");
  });

  it("sets Auto, the sweep, the airflow, night mode and heat from its panel", () => {
    const handlers = all();
    const { getByRole } = render(<DysonModule entity={{ ...DYSON_SEEDS.heating.entity, oscillating: true, oscillationMode: "90°" }} defaultOpen {...handlers} />);
    fireEvent.click(getByRole("button", { name: "Set mode to Manual" }));
    fireEvent.click(getByRole("button", { name: "Oscillate 180°" }));
    fireEvent.click(getByRole("button", { name: "Stop oscillating" }));
    fireEvent.click(getByRole("button", { name: "Airflow back" }));
    fireEvent.click(getByRole("button", { name: "Night mode" }));
    fireEvent.click(getByRole("button", { name: "Heat" }));
    expect(handlers.onAutoChange).toHaveBeenCalledWith(false);
    expect(handlers.onOscillationModeChange).toHaveBeenCalledWith("180°");
    expect(handlers.onOscillateChange).toHaveBeenCalledWith(false);
    expect(handlers.onDirectionChange).toHaveBeenCalledWith("reverse");
    expect(handlers.onNightModeChange).toHaveBeenCalledWith(true);
    expect(handlers.onHeatChange).toHaveBeenCalledWith(false);
    expect(getByRole("slider", { name: "Hot+Cool heat target" })).toBeTruthy();
  });

  it("prints every reading in Dyson's bands, and its filters, in its panel", () => {
    const { getByText } = render(<DysonModule entity={DYSON_SEEDS.heating.entity} defaultOpen {...all()} />);
    expect(getByText("PM2.5").parentElement?.textContent).toBe("PM2.541 µg/m³Fair");
    expect(getByText("Filter").parentElement?.textContent).toBe("Filter38%");
  });
});
