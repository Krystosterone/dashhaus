import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlarmCard } from "./AlarmCard";
import { ALARM_SEEDS } from "@dashhaus/core/seeds/alarm";

describe("AlarmCard", () => {
  it("never disarms a coded alarm on a tap: the card asks the sheet for the code", () => {
    const onDisarm = vi.fn();
    const onOpenDetails = vi.fn();
    render(<AlarmCard entity={ALARM_SEEDS.triggered.entity} onArm={() => {}} onDisarm={onDisarm} onOpenDetails={onOpenDetails} />);
    fireEvent.click(screen.getByRole("button", { name: "Disarm" }));
    expect(onDisarm).not.toHaveBeenCalled();
    expect(onOpenDetails).toHaveBeenCalledWith({ kind: "disarm" });
  });

  it("disarms with the code typed on the sheet's keypad", async () => {
    const onDisarm = vi.fn(async () => true);
    render(<AlarmCard entity={ALARM_SEEDS.triggered.entity} variant="sheet" action={{ kind: "disarm" }} onArm={() => {}} onDisarm={onDisarm} />);
    for (const d of ["1", "2", "3", "4"]) fireEvent.click(screen.getByRole("button", { name: d }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Enter code" })); });
    expect(onDisarm).toHaveBeenCalledWith("1234");
  });

  it("offers nothing to arm or disarm when view only", () => {
    render(<AlarmCard entity={ALARM_SEEDS.triggered.entity} readOnly onArm={() => {}} onDisarm={() => {}} />);
    expect(screen.queryByRole("button", { name: "Disarm" })).toBeNull();
  });
});
