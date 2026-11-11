import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ClimateEntity } from "@dashhaus/core/entities/climate/types";
import { CLIMATE_SEEDS } from "@dashhaus/core/seeds/climate";
import { ClimateCard } from "./ClimateCard";

const heating: ClimateEntity = CLIMATE_SEEDS.heating.entity;
const status = (entity: ClimateEntity) => render(<ClimateCard entity={entity} onToggle={vi.fn()} onTargetChange={vi.fn()} />).container.querySelector(".hd-area")?.textContent;

describe("ClimateCard", () => {
  it("says the room's temperature now and what the unit is doing on its status line", () => {
    expect(status(heating)).toBe("20.4° now · Heating");
  });

  it("says No reading yet in the room temperature's place before its first, and nothing where it never reports one", () => {
    expect(status({ ...heating, currentTemperature: undefined })).toBe("No reading yet · Heating");
    expect(status({ ...heating, currentTemperature: undefined, reportsCurrentTemperature: false })).toBe("Heating");
  });

  it("draws a unit no press can switch (a heat-only thermostat) with its mode icon bare, never a press it would refuse", () => {
    const onToggle = vi.fn();
    const { container } = render(<ClimateCard entity={CLIMATE_SEEDS.heatOnly.entity} onToggle={onToggle} onTargetChange={vi.fn()} />);
    expect(container.querySelector("button.hd-orb")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Radiators, / })).toBeNull();
    // Its target is still set.
    expect(screen.getByRole("group", { name: "Radiators target temperature" })).toBeTruthy();
  });
});
