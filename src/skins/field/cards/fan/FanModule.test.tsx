import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FanModule } from "./FanModule";
import { FAN_SEEDS } from "@dashhaus/core/seeds/fan";
import type { FanEntity } from "@dashhaus/core/entities/fan/types";

const handlers = () => ({
  onToggle: vi.fn(),
  onPercentageChange: vi.fn(),
  onPresetChange: vi.fn(),
  onOscillateChange: vi.fn(),
  onDirectionChange: vi.fn(),
});
const draw = (entity: FanEntity, options: { footprint?: "compact" | "standard"; defaultOpen?: boolean } = {}) => {
  const h = handlers();
  const { container } = render(<FanModule entity={entity} {...h} {...options} />);
  return { container, ...h };
};

describe("FanModule", () => {
  it("switches from its key, its LED lit while on", () => {
    const { container, onToggle } = draw(FAN_SEEDS.on.entity);
    const key = screen.getByRole("button", { name: "Tower fan" });
    expect(key.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".fd-led")?.getAttribute("data-lit")).toBe("true");
    fireEvent.click(key);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("sets the speed on the fader, one stop per speed, in percent", () => {
    const { onPercentageChange } = draw(FAN_SEEDS.on.entity);
    const fader = screen.getByRole("slider", { name: "Tower fan speed" });
    expect(fader.getAttribute("aria-valuetext")).toBe("Speed 2 of 3");
    expect(fader.getAttribute("max")).toBe("3");
    fireEvent.keyDown(fader, { key: "ArrowRight" });
    expect(onPercentageChange).toHaveBeenLastCalledWith(100);
  });

  it("draws no thumb while off, since Home Assistant reports no speed then, and a slide still turns it on", () => {
    const { container, onPercentageChange } = draw({ ...FAN_SEEDS.on.entity, state: "off", percentage: undefined });
    const fader = screen.getByRole("slider", { name: "Tower fan speed" });
    expect(fader.getAttribute("aria-valuetext")).toBe("Off");
    expect(container.querySelector(".fd-thumb")).toBeNull();
    fireEvent.change(fader, { target: { value: "3" } });
    expect(onPercentageChange).toHaveBeenLastCalledWith(100);
  });

  it("reads a stepped fan's step on the screen, a stepless one's percent, and its sweep beside it", () => {
    const { container } = draw(FAN_SEEDS.on.entity);
    expect(container.querySelector(".fd-read")?.textContent).toBe("2/3 of 3");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Oscillating/);
    const ceiling = draw(FAN_SEEDS.ceiling.entity).container;
    expect(ceiling.querySelector(".fd-read")?.textContent).toBe("40%");
  });

  it("keeps a fan without speeds to one wide key with its state word", () => {
    const { container } = draw(FAN_SEEDS.onOff.entity);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(container.querySelector(".fd-key-cap")?.textContent).toBe("Off");
  });

  it("holds presets, oscillation and direction in the panel", () => {
    const entity: FanEntity = { ...FAN_SEEDS.on.entity, supportsDirection: true, direction: "forward" };
    const { onPresetChange, onOscillateChange, onDirectionChange } = draw(entity, { defaultOpen: true });
    fireEvent.click(screen.getByRole("button", { name: "Set preset to Sleep" }));
    fireEvent.click(screen.getByRole("button", { name: "Oscillate" }));
    fireEvent.click(screen.getByRole("button", { name: "Turn reverse" }));
    expect(onPresetChange).toHaveBeenCalledWith("sleep");
    expect(onOscillateChange).toHaveBeenCalledWith(false);
    expect(onDirectionChange).toHaveBeenCalledWith("reverse");
  });

  it("blanks the screen while unavailable, says when it was last seen, and lays its key flat with no state word", () => {
    const { container, onToggle } = draw(FAN_SEEDS.unavailable.entity);
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(container.querySelector(".fd-key-cap")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Garage fan" }));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("leads a compact row with its key", () => {
    expect(draw(FAN_SEEDS.on.entity, { footprint: "compact" }).container.querySelector(".fd-module > .fd-key")).not.toBeNull();
  });

  it("lays a fan flat whose press it doesn't declare (no TURN_OFF while on)", () => {
    const { onToggle } = draw({ ...FAN_SEEDS.onOff.entity, state: "on", supportsTurnOff: false });
    const key = screen.getAllByRole("button", { name: FAN_SEEDS.onOff.entity.name })[0];
    expect(key.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(key);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
