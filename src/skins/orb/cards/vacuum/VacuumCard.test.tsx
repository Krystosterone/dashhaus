import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VacuumCard } from "./VacuumCard";
import type { VacuumEntity } from "@dashhaus/core/entities/vacuum/types";

const cleaning: VacuumEntity = {
  entityId: "vacuum.downstairs", name: "Robot vacuum", area: "Hall", state: "cleaning", battery: 72, lastChanged: "11:20",
  supportsStart: true, supportsPause: true, supportsReturn: true, supportsLocate: true, supportsFanSpeed: true, fanSpeeds: ["quiet", "turbo"], fanSpeed: "quiet",
};
const handlers = () => ({ onStart: vi.fn(), onPause: vi.fn(), onReturnToBase: vi.fn(), onLocate: vi.fn(), onFanSpeedChange: vi.fn() });

describe("VacuumCard", () => {
  it("is a state: no glow, and cleaning is the accent", () => {
    const { container } = render(<VacuumCard entity={cleaning} {...handlers()} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("state");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd vc");
    expect(screen.getByRole("button", { name: /^Robot vacuum: Cleaning · Pause/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("pauses a vacuum that moves, from the orb and the pill", () => {
    const h = handlers();
    render(<VacuumCard entity={cleaning} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause Robot vacuum" }));
    fireEvent.click(screen.getByRole("button", { name: /^Robot vacuum: Cleaning · Pause/ }));
    expect(h.onPause).toHaveBeenCalledTimes(2);
    expect(h.onStart).not.toHaveBeenCalled();
  });

  it("starts one that stands, and resumes one that is paused", () => {
    const h = handlers();
    const { rerender } = render(<VacuumCard entity={{ ...cleaning, state: "docked" }} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Start Robot vacuum" }));
    rerender(<VacuumCard entity={{ ...cleaning, state: "paused" }} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: /^Robot vacuum: Paused · Resume/ }));
    expect(h.onStart).toHaveBeenCalledTimes(2);
  });

  it("sends a vacuum that can't pause back to its dock instead", () => {
    const h = handlers();
    render(<VacuumCard entity={{ ...cleaning, supportsPause: false }} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Send Robot vacuum back to its dock" }));
    expect(h.onReturnToBase).toHaveBeenCalledOnce();
  });

  it("leads with an error behind the warn marker, saying what went wrong; the pill starts it again", () => {
    const h = handlers();
    const { container } = render(<VacuumCard entity={{ ...cleaning, state: "error", error: "Main brush jammed" }} {...h} />);
    expect(container.querySelector("article")?.getAttribute("data-alert")).toBe("warn");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Error · Main brush jammed");
    expect(screen.getByLabelText("Warning: Robot vacuum has stopped with an error: main brush jammed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Robot vacuum: Error · Start again/ }));
    expect(h.onStart).toHaveBeenCalledOnce();
  });

  it("warns of a low battery while it stands away from the dock, never on it or on its way", () => {
    const { container, rerender } = render(<VacuumCard entity={{ ...cleaning, state: "idle", battery: 9 }} {...handlers()} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Battery 9%");
    rerender(<VacuumCard entity={{ ...cleaning, state: "docked", battery: 9 }} {...handlers()} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Hall");
    rerender(<VacuumCard entity={{ ...cleaning, battery: 9 }} {...handlers()} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Hall");
    rerender(<VacuumCard entity={{ ...cleaning, state: "returning", battery: 9 }} {...handlers()} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Hall");
  });

  it("says an integration's own state in its words", () => {
    render(<VacuumCard entity={{ ...cleaning, state: "other", stateText: "Emptying the bin" }} {...handlers()} footprint="compact" showControl={false} />);
    expect(screen.getAllByText("Emptying the bin").length).toBeGreaterThan(0);
  });

  it("offers the dock, locate and its fan speeds in the sheet", () => {
    const h = handlers();
    render(<VacuumCard entity={cleaning} {...h} variant="sheet" />);
    fireEvent.click(screen.getByRole("button", { name: "Send Robot vacuum back to its dock" }));
    fireEvent.click(screen.getByRole("button", { name: "Locate Robot vacuum: it plays a sound" }));
    fireEvent.click(screen.getByRole("button", { name: "Turbo" }));
    expect(h.onReturnToBase).toHaveBeenCalledOnce();
    expect(h.onLocate).toHaveBeenCalledOnce();
    expect(h.onFanSpeedChange).toHaveBeenCalledWith("turbo");
    expect(screen.getByText("Battery 72%")).toBeTruthy();
  });

  it("says Unavailable and ignores the orb while unavailable", () => {
    const h = handlers();
    render(<VacuumCard entity={{ ...cleaning, state: "unavailable", lastSeen: "08:20" }} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Robot vacuum: Unavailable" }));
    expect(h.onStart).not.toHaveBeenCalled();
    expect(h.onPause).not.toHaveBeenCalled();
    expect(screen.getByText("Last seen 08:20")).toBeTruthy();
  });

  it("keeps one state cue in the compact row", () => {
    const { container } = render(<VacuumCard entity={{ ...cleaning, state: "docked" }} footprint="compact" {...handlers()} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Docked");
  });

  it("keeps the accent on its way home, its active set (isActive), and rests once it stands", () => {
    render(<VacuumCard entity={{ ...cleaning, state: "returning" }} {...handlers()} />);
    expect(screen.getByRole("button", { name: /^Robot vacuum: Returning · Pause/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Pause Robot vacuum" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("draws its state readout and its sheet's actions on the shared parts", () => {
    const { container } = render(<VacuumCard entity={{ ...cleaning, state: "returning", supportsPause: false }} variant="sheet" {...handlers()} />);
    expect(container.querySelector(".hd-st")?.textContent).toBe("Returning");
    expect(container.querySelector(".hd-num")?.classList.contains("hd-num--long")).toBe(true);
    const docked = render(<VacuumCard entity={{ ...cleaning, state: "idle" }} variant="sheet" {...handlers()} />);
    expect([...docked.container.querySelectorAll(".hd-acts button")].map((b) => b.textContent)).toEqual(["Return to dock", "Locate"]);
  });
});
