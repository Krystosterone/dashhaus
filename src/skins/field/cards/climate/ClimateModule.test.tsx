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
    // The label says what a press does, so it isn't also announced as pressed; the LED says it's on.
    const key = screen.getByRole("button", { name: "Thermostat, turn off" });
    expect(key.hasAttribute("aria-pressed")).toBe(false);
    expect(key.querySelector(".fd-led")?.getAttribute("data-lit")).toBe("true");
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

  it("keeps an irregular Fahrenheit endpoint available to keyboard input", () => {
    const onRangeChange = vi.fn();
    render(<ClimateModule entity={CLIMATE_SEEDS.worstCase.entity} onToggle={vi.fn()} onTargetChange={vi.fn()} onRangeChange={onRangeChange} />);
    const high = screen.getByRole("slider", { name: "North-east open-plan living and dining heat pump, cool above" }) as HTMLInputElement;
    expect(high.value).toBe("95");

    fireEvent.keyDown(high, { key: "ArrowDown" });

    expect(onRangeChange).toHaveBeenCalledWith(44.6, 94.5);
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

  it("announces the current choice as pressed and keeps it focusable, without choosing it again", () => {
    const onModeChange = vi.fn();
    render(<ClimateModule entity={CLIMATE_SEEDS.heating.entity} defaultOpen onToggle={vi.fn()} onTargetChange={vi.fn()} onModeChange={onModeChange} />);
    const panel = screen.getByRole("dialog", { name: "Thermostat details", hidden: true });
    const keys = within(within(panel).getByRole("group", { name: "Mode", hidden: true })).getAllByRole("button", { hidden: true }) as HTMLButtonElement[];
    const chosen = keys.filter((key) => key.getAttribute("aria-pressed") === "true");
    expect(chosen).toHaveLength(1);
    expect(chosen[0].disabled).toBe(false);
    expect(keys.every((key) => key.hasAttribute("aria-pressed"))).toBe(true);
    expect(chosen[0].querySelector(".fd-led")).toBeNull();
    fireEvent.click(chosen[0]);
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it("uses blank segments, explicit unavailable copy and no live controls when unreachable", () => {
    const entity = {
      ...CLIMATE_SEEDS.unavailable.entity,
      presetMode: "home",
      presetModes: ["home", "away"],
      fanMode: "auto",
      fanModes: ["auto", "high"],
    };
    const { container: el } = render(
      <ClimateModule
        entity={entity}
        defaultOpen
        onToggle={vi.fn()}
        onTargetChange={vi.fn()}
        onRangeChange={vi.fn()}
        onModeChange={vi.fn()}
        onPresetChange={vi.fn()}
        onFanChange={vi.fn()}
      />,
    );
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    const module = el.querySelector("article")!;
    expect(within(module).getByText("Unavailable", { selector: ".fd-sr" })).toBeTruthy();
    expect(within(module).getByRole("button", { name: "Garage heater, unavailable" }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByRole("slider")).toBeNull();
    const panel = screen.getByRole("dialog", { name: "Garage heater details", hidden: true });
    expect(within(panel).getByRole("button", { name: "Garage heater, unavailable", hidden: true }).getAttribute("aria-disabled")).toBe("true");
    expect(within(panel).queryByRole("button", { name: /^Set (mode|preset|fan) to /, hidden: true })).toBeNull();
  });
});
