import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoverCard } from "./CoverCard";
import type { CoverCardProps } from "./CoverCard";
import { SETTLE_MS } from "@dashhaus/core/hooks";
import { COVER_SEEDS, COVER_WORST_CASE } from "@dashhaus/core/seeds/cover";
import type { CoverEntity } from "@dashhaus/core/entities/cover/types";

/*
 * A garage door, door or gate never moves on one tap (spec/cards.md → Using the cover card): the orb and the groove's
 * ends ask, the sheet answers, Stop is one tap, and its position is shown, never set. Everything else moves at once.
 */
const garage = COVER_SEEDS.garage.entity;
const longDoor = COVER_WORST_CASE.find(({ entity }) => entity.entityId === "cover.garage_side")!.entity;
const stuckGate = COVER_WORST_CASE.find(({ entity }) => entity.entityId === "cover.gate")!.entity;

const draw = (entity: CoverEntity, props: Partial<CoverCardProps> = {}) => {
  const handlers = { onOpenCover: vi.fn(), onCloseCover: vi.fn(), onStopCover: vi.fn(), onSetPosition: vi.fn(), onOpenDetails: vi.fn() };
  const view = render(<CoverCard entity={entity} {...handlers} {...props} />);
  return { ...view, ...handlers };
};
const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

afterEach(() => { vi.useRealTimers(); });

describe("CoverCard", () => {
  it("moves a curtain or a blind on one tap: the orb, the groove's ends and the bar", () => {
    const curtains = draw(COVER_SEEDS.curtains.entity);
    fireEvent.click(button("Curtains"));
    expect(curtains.onCloseCover).toHaveBeenCalledOnce();
    expect(screen.getByRole("slider", { name: "Curtains position" })).toBeTruthy();
    curtains.unmount();

    const blind = draw(COVER_SEEDS.unknown.entity);
    fireEvent.click(button("Close Study blind"));
    fireEvent.click(button("Open Study blind"));
    expect(blind.onCloseCover).toHaveBeenCalledOnce();
    expect(blind.onOpenCover).toHaveBeenCalledOnce();
    expect(blind.onOpenDetails).not.toHaveBeenCalled();
  });

  it("never moves a garage door on a tap: the orb and the groove open the sheet on the question, and say so", () => {
    const { onCloseCover, onOpenCover, onOpenDetails } = draw(garage);
    // The orb and the groove's Close end, each named with the ellipsis an orb action that asks carries.
    const closes = screen.getAllByRole("button", { name: "Close Garage door…" });
    expect(closes).toHaveLength(2);
    for (const close of closes) fireEvent.click(close);
    const ends = screen.getByRole("group", { name: "Garage door" });
    expect(onCloseCover).not.toHaveBeenCalled();
    expect(onOpenDetails.mock.calls).toEqual([["close"], ["close"]]);
    // Open while it is open lies flat, as on every cover.
    expect(ends.querySelector<HTMLButtonElement>('[aria-label="Open Garage door…"]')!.disabled).toBe(true);
    expect(onOpenCover).not.toHaveBeenCalled();
  });

  it("asks in the sheet: Cancel focused, a press too soon ignored, the yes naming what it moves, the groove flat meanwhile", async () => {
    vi.useFakeTimers();
    const onCloseCover = vi.fn();
    render(<CoverCard entity={longDoor} variant="sheet" action="close" onOpenCover={() => {}} onCloseCover={onCloseCover} onStopCover={() => {}} onSetPosition={() => {}} />);
    expect(screen.getByText("Close Garage side door to the back garden?")).toBeTruthy();
    expect(screen.getByText("It closes now. Check nothing is in its way.")).toBeTruthy();
    expect(button("Cancel").hasAttribute("data-autofocus")).toBe(true);
    expect(button("Close door").hasAttribute("data-autofocus")).toBe(false);
    // One Close answers: the groove's own ends lie flat while the question stands, and the hint waits for it to go.
    const ends = screen.getByRole("group", { name: longDoor.name });
    expect([...ends.querySelectorAll<HTMLButtonElement>(".cv-oc-b")].every((end) => end.disabled)).toBe(true);
    expect(screen.queryByText("Opening and closing ask first.")).toBeNull();
    fireEvent.click(button("Close door"));
    expect(onCloseCover).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    await act(async () => { fireEvent.click(button("Close door")); });
    expect(onCloseCover).toHaveBeenCalledOnce();
    expect(screen.queryByText("Close Garage side door to the back garden?")).toBeNull();
  });

  it("cancels without moving, and says in the sheet that opening and closing ask first", () => {
    const onCloseCover = vi.fn();
    render(<CoverCard entity={garage} variant="sheet" action="close" onOpenCover={() => {}} onCloseCover={onCloseCover} onStopCover={() => {}} />);
    fireEvent.click(button("Cancel"));
    expect(onCloseCover).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Close garage door" })).toBeNull();
    expect(screen.getByText("Opening and closing ask first.")).toBeTruthy();
    // The sheet's own orb and groove ask again, here.
    fireEvent.click(screen.getAllByRole("button", { name: "Close Garage door…" })[0]);
    expect(screen.getByText("Close Garage door?")).toBeTruthy();
    expect(onCloseCover).not.toHaveBeenCalled();
  });

  it("closes the question once the door is on its way, leaving Stop under the same finger", () => {
    const onStopCover = vi.fn();
    const props = { variant: "sheet" as const, onOpenCover: () => {}, onCloseCover: () => {}, onStopCover };
    const { rerender } = render(<CoverCard entity={garage} action="close" {...props} />);
    expect(screen.getByText("Close Garage door?")).toBeTruthy();
    rerender(<CoverCard entity={{ ...garage, state: "closing" }} action="close" {...props} />);
    expect(screen.queryByText("Close Garage door?")).toBeNull();
    fireEvent.click(button("Stop Garage door"));
    expect(onStopCover).toHaveBeenCalledOnce();
  });

  it("stops a garage door or gate on its way on one tap, the orb's and the groove's", () => {
    const { onStopCover, onOpenDetails } = draw(COVER_SEEDS.gate.entity);
    fireEvent.click(button("Stop Driveway gate"));
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStopCover).toHaveBeenCalledTimes(2);
    expect(onOpenDetails).not.toHaveBeenCalled();
  });

  it("lies flat on its way where it can't be stopped, saying where it is going, so a tap opens no empty sheet", () => {
    const { onOpenCover, onCloseCover, onOpenDetails } = draw({ ...stuckGate, state: "closing" });
    fireEvent.click(button("Gate: Closing…"));
    const ends = screen.getByRole("group", { name: "Gate" });
    expect([...ends.querySelectorAll<HTMLButtonElement>(".cv-oc-b")].every((end) => end.disabled)).toBe(true);
    expect(ends.textContent).toContain("Closing…");
    expect(onOpenDetails).not.toHaveBeenCalled();
    expect(onOpenCover).not.toHaveBeenCalled();
    expect(onCloseCover).not.toHaveBeenCalled();
  });

  it("says a gate that can't stop can't be stopped from here, and names it in the yes", () => {
    render(<CoverCard entity={stuckGate} variant="sheet" action="close" onOpenCover={() => {}} onCloseCover={() => {}} onStopCover={() => {}} />);
    expect(screen.getByText("It closes now. Check nothing is in its way. It can't be stopped from here.")).toBeTruthy();
    expect(button("Close gate")).toBeTruthy();
  });

  it("shows a door's position and never sets it: no bar and no quick positions, on the card or in the sheet", () => {
    const card = draw(longDoor);
    expect(card.onSetPosition).not.toHaveBeenCalled();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByRole("group", { name: longDoor.name })).toBeTruthy();
    card.unmount();
    draw(longDoor, { variant: "sheet" });
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByText("Quick positions")).toBeNull();
  });

  it("asks before either end moves a garage door whose place isn't known", () => {
    const { onOpenCover, onCloseCover, onOpenDetails } = draw({ ...garage, state: "unknown" });
    const ends = [...screen.getByRole("group", { name: "Garage door" }).querySelectorAll<HTMLButtonElement>(".cv-oc-b")];
    expect(ends.map((end) => [end.getAttribute("aria-label"), end.disabled])).toEqual([["Close Garage door…", false], ["Open Garage door…", false]]);
    for (const end of ends) fireEvent.click(end);
    // The orb opens it, as Home Assistant's own toggle does, and asks first too.
    fireEvent.click(screen.getAllByRole("button", { name: "Open Garage door…" }).find((b) => !ends.includes(b as HTMLButtonElement))!);
    expect(onOpenDetails.mock.calls.map(([a]) => a)).toEqual(["close", "open", "open"]);
    expect(onOpenCover).not.toHaveBeenCalled();
    expect(onCloseCover).not.toHaveBeenCalled();
  });
});
