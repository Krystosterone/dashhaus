import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DysonCard } from "./DysonCard";
import { DYSON_SEEDS } from "@dashhaus/core/seeds/dyson";
import type { DysonEntity } from "@dashhaus/core/entities/dyson/types";

const entity: DysonEntity = DYSON_SEEDS.on.entity;
const heater: DysonEntity = DYSON_SEEDS.heating.entity;

describe("DysonCard", () => {
  it("is a state with no glow while it cleans, and claims the energy bloom while it heats", () => {
    const { container, rerender } = render(<DysonCard entity={entity} onToggle={() => {}} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("state");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd dy");
    rerender(<DysonCard entity={heater} onToggle={() => {}} />);
    expect(container.querySelector("article")?.getAttribute("data-role")).toBe("energy");
  });

  it("toggles from the orb, and sets a speed on its groove of ten", () => {
    const onToggle = vi.fn();
    const onPercentageChange = vi.fn();
    render(<DysonCard entity={entity} onToggle={onToggle} onPercentageChange={onPercentageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Purifier" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    const groove = screen.getByRole("slider", { name: "Purifier speed" });
    expect(groove.getAttribute("aria-valuetext")).toBe("Speed 4 of 10");
    fireEvent.change(groove, { target: { value: "7" } });
    expect(onPercentageChange).toHaveBeenCalledWith(70);
  });

  it("says Auto on its groove while it chooses its own speed", () => {
    render(<DysonCard entity={heater} onToggle={() => {}} onPercentageChange={() => {}} />);
    expect(screen.getByRole("slider", { name: "Hot+Cool speed" }).getAttribute("aria-valuetext")).toBe("Auto, choosing its own speed");
  });

  it("names the room and the air, or what it runs as, on the status line", () => {
    const { container, rerender } = render(<DysonCard entity={{ ...entity, oscillating: false }} onToggle={() => {}} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Bedroom · Air good");
    rerender(<DysonCard entity={heater} onToggle={() => {}} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Living room · Heat 23°");
  });

  it("leads with poor air, then a worn filter, behind the warn marker", () => {
    const { container, rerender } = render(<DysonCard entity={DYSON_SEEDS.poorAir.entity} onToggle={() => {}} />);
    expect(container.querySelector("article")?.getAttribute("data-level")).toBe("advisory");
    expect(screen.getByText("Poor air")).toBeTruthy();
    expect(screen.getByLabelText("Warning: Purifier: Poor air: Fine particles 62 µg/m³")).toBeTruthy();
    rerender(<DysonCard entity={DYSON_SEEDS.filter.entity} onToggle={() => {}} />);
    expect(screen.getByText("Change filter")).toBeTruthy();
    expect(container.querySelector("article")?.getAttribute("data-level")).toBe("advisory");
  });

  it("sets Auto, the sweep, the airflow, night mode and heat from the sheet", () => {
    const handlers = {
      onAutoChange: vi.fn(), onOscillateChange: vi.fn(), onOscillationModeChange: vi.fn(), onDirectionChange: vi.fn(),
      onNightModeChange: vi.fn(), onHeatChange: vi.fn(), onHeatTargetChange: vi.fn(),
    };
    render(<DysonCard entity={{ ...heater, state: "on" }} variant="sheet" onToggle={() => {}} {...handlers} />);
    const pick = (group: string, option: string) => fireEvent.click(within(screen.getByRole("group", { name: group })).getByRole("button", { name: option }));
    pick("Mode", "Manual");
    pick("Oscillation", "180°");
    pick("Oscillation", "Off");
    pick("Airflow", "Back");
    pick("Night mode", "On");
    pick("Heat", "Off");
    fireEvent.click(screen.getByRole("button", { name: "Raise to 24°" }));
    expect(handlers.onAutoChange).toHaveBeenCalledWith(false);
    expect(handlers.onOscillationModeChange).toHaveBeenCalledWith("180°");
    expect(handlers.onOscillateChange).toHaveBeenCalledWith(false);
    expect(handlers.onDirectionChange).toHaveBeenCalledWith("reverse");
    expect(handlers.onNightModeChange).toHaveBeenCalledWith(true);
    expect(handlers.onHeatChange).toHaveBeenCalledWith(false);
    expect(handlers.onHeatTargetChange).toHaveBeenCalledWith(24);
  });

  it("aims a Pure Cool on its angles: still or a sweep round where it points, and the dial turns it", () => {
    const onAimChange = vi.fn();
    const onSpreadChange = vi.fn();
    const pointing = DYSON_SEEDS.pointing.entity;
    render(<DysonCard entity={pointing} variant="sheet" onToggle={() => {}} onOscillateChange={() => {}} onAimChange={onAimChange} onSpreadChange={onSpreadChange} />);
    const chips = screen.getByRole("group", { name: "Oscillation" });
    expect(within(chips).getByRole("button", { name: "Still" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(chips).getByRole("button", { name: "90°" }));
    expect(onSpreadChange).toHaveBeenLastCalledWith(90);
    const dial = screen.getByRole("slider", { name: "Purifier aims" });
    expect(dial.getAttribute("aria-valuetext")).toBe("Points 58° right");
    fireEvent.change(dial, { target: { value: "175" } });
    expect(onAimChange).toHaveBeenLastCalledWith(175);
  });

  it("lists every reading in Dyson's bands, and its filters, in the sheet", () => {
    render(<DysonCard entity={heater} variant="sheet" onToggle={() => {}} />);
    expect(screen.getByText("Air quality").parentElement?.textContent).toBe("Air qualityFair");
    expect(screen.getByText("PM2.5").closest(".dy-row")?.textContent).toBe("PM2.541 µg/m³Fair");
    expect(screen.getByText("HCHO").closest(".dy-row")?.textContent).toBe("HCHO0.02 mg/m³Good");
    expect(screen.getByText("Filter").closest(".dy-row")?.textContent).toBe("Filter38%");
  });

  it("says Unavailable and ignores the orb while unavailable", () => {
    const onToggle = vi.fn();
    render(<DysonCard entity={DYSON_SEEDS.unavailable.entity} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Purifier" }));
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText("Last seen 08:20")).toBeTruthy();
  });

  it("keeps one state cue in the compact row", () => {
    const { container } = render(<DysonCard entity={DYSON_SEEDS.off.entity} footprint="compact" onToggle={() => {}} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Off");
  });
});
