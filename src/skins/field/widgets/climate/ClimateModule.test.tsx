import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClimateEntity } from "../../../../domains/climate/types";
import { ClimateModule } from "./ClimateModule";
import { CLIMATE_SEEDS } from "./demo/useDemoClimate";

function draw(entity: ClimateEntity, footprint?: "compact" | "standard") {
  return render(
    <ClimateModule
      entity={entity}
      footprint={footprint}
      onToggle={vi.fn()}
      onTargetChange={vi.fn()}
      onRangeChange={vi.fn()}
      onModeChange={vi.fn()}
      onPresetChange={vi.fn()}
      onFanChange={vi.fn()}
    />,
  ).container;
}

describe("ClimateModule", () => {
  it("leads with room temperature, then the target and active HVAC action", () => {
    const el = draw(CLIMATE_SEEDS.heating.entity);
    expect(el.querySelector(".fd-read")?.textContent).toBe("20.4°C");
    expect(el.querySelector(".fd-meta")?.textContent).toBe("Heat to 21.5°Heating");
    expect(screen.getByRole("button", { name: "Thermostat, turn off" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("slider", { name: "Thermostat target temperature" }).getAttribute("aria-valuetext")).toBe("21.5 degrees Celsius");
  });

  it("shows OFF and replaces target adjustment with one full-width turn-on key", () => {
    const el = draw(CLIMATE_SEEDS.off.entity);
    expect(el.querySelector(".fd-read")?.textContent).toBe("OFF");
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByRole("button", { name: "Baseboard, turn on" }).textContent).toContain("Turn on");
  });

  it("keeps the compact footprint to the power key and current screen", () => {
    const el = draw(CLIMATE_SEEDS.cooling.entity, "compact");
    expect(el.querySelector("article")?.getAttribute("data-footprint")).toBe("compact");
    expect(el.querySelector(".fd-read")?.textContent).toBe("22.1°C");
    expect(screen.queryByRole("slider")).toBeNull();
  });

  it("keeps heat-below and cool-above ordered when a range thumb crosses", () => {
    const onRangeChange = vi.fn();
    render(<ClimateModule entity={CLIMATE_SEEDS.range.entity} onToggle={vi.fn()} onTargetChange={vi.fn()} onRangeChange={onRangeChange} />);
    const low = screen.getByRole("slider", { name: "Heat pump, heat below" });
    const high = screen.getByRole("slider", { name: "Heat pump, cool above" });
    expect(low.getAttribute("aria-valuetext")).toBe("Heat below 19 degrees Celsius");
    expect(high.getAttribute("aria-valuetext")).toBe("Cool above 24 degrees Celsius");
    fireEvent.change(low, { target: { value: "26" } });
    expect(onRangeChange).toHaveBeenCalledWith(24, 24);
  });

  it("exposes exact range steps and supported mode, preset and fan commands in details", () => {
    const onRangeChange = vi.fn();
    const onModeChange = vi.fn();
    const onPresetChange = vi.fn();
    const onFanChange = vi.fn();
    render(
      <ClimateModule
        entity={{ ...CLIMATE_SEEDS.heating.entity, state: "heat_cool", targetTemperature: undefined, targetLow: 19, targetHigh: 24 }}
        defaultOpen
        onToggle={vi.fn()}
        onTargetChange={vi.fn()}
        onRangeChange={onRangeChange}
        onModeChange={onModeChange}
        onPresetChange={onPresetChange}
        onFanChange={onFanChange}
      />,
    );
    const panel = screen.getByRole("dialog", { name: "Thermostat details", hidden: true });
    fireEvent.click(within(panel).getByRole("button", { name: "Raise heat threshold to 19.5°", hidden: true }));
    fireEvent.click(within(panel).getByRole("button", { name: "Set mode to Cool", hidden: true }));
    fireEvent.click(within(panel).getByRole("button", { name: "Set preset to Away", hidden: true }));
    fireEvent.click(within(panel).getByRole("button", { name: "Set fan to High", hidden: true }));
    expect(onRangeChange).toHaveBeenCalledWith(19.5, 24);
    expect(onModeChange).toHaveBeenCalledWith("cool");
    expect(onPresetChange).toHaveBeenCalledWith("away");
    expect(onFanChange).toHaveBeenCalledWith("high");
  });

  it("uses blank segments, explicit unavailable copy and no live controls when unreachable", () => {
    const el = draw(CLIMATE_SEEDS.unavailable.entity);
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(screen.getByText("Unavailable", { selector: ".fd-sr" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Garage heater, unavailable" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("slider")).toBeNull();
  });
});
