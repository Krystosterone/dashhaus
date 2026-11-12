import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaCoverModule } from "./HaCoverModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/cover.json";

const raw = fixture as HassEntities;
const ID = "cover.living_room";
const renderLive = () => renderConnected(<HaCoverModule entityId={ID} loadHistory={false} />, raw);

/** A pointer on the module's fader's hit layer, laid out so x - 9 (the thumb's half) is the position it picks. */
const onFader = (fader: HTMLElement) => {
  Object.defineProperty(fader, "getBoundingClientRect", { value: () => ({ left: 0, width: 118 }) });
  Object.defineProperty(Element.prototype, "setPointerCapture", { value: vi.fn(), configurable: true });
  const hit = fader.querySelector(".fd-hit")!;
  return (type: string, v: number) => {
    const event = new MouseEvent(type, { bubbles: true, clientX: v + 9, button: 0 });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: "mouse" } });
    fireEvent(hit, event);
  };
};

describe("HaCoverModule", () => {
  it("sends each of its keys' presses to Home Assistant (a reading has none, so its presses call nothing)", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).not.toBe("unavailable"));
    const keys = [...live.container.querySelectorAll<HTMLButtonElement>(".fd-key")];
    // Some hooks read through Home Assistant as they mount (weather's forecasts); count only what the presses send.
    const before = live.callService.mock.calls.length;
    await act(async () => {
      for (const key of keys) fireEvent.click(key);
      await Promise.resolve();
    });
    expect(live.callService.mock.calls.length - before).toBe(keys.length);
  });

  it("sends the position fader and the panel's quick positions and slats through native cover services", async () => {
    const live = renderConnected(<HaCoverModule entityId={ID} loadHistory={false} defaultOpen />, raw);
    await waitFor(() => expect(screen.getAllByRole("slider", { name: "Living room blinds position", hidden: true }).length).toBeGreaterThan(0));
    await act(async () => {
      fireEvent.change(screen.getAllByRole("slider", { name: "Living room blinds position", hidden: true })[0], { target: { value: "40" } });
      fireEvent.click(screen.getByRole("button", { name: "Half open", hidden: true }));
      fireEvent.change(screen.getByRole("slider", { name: "Living room blinds slats", hidden: true }), { target: { value: "80" } });
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("cover", "set_cover_position", { entity_id: ID, position: 40 });
    expect(live.callService).toHaveBeenCalledWith("cover", "set_cover_position", { entity_id: ID, position: 50 });
    expect(live.callService).toHaveBeenCalledWith("cover", "set_cover_tilt_position", { entity_id: ID, tilt_position: 80 });
  });

  it("sends one set_cover_position for a drag or a tap, none before the release, and holds where it was let go", async () => {
    const live = renderLive();
    await waitFor(() => expect(screen.getAllByRole("slider", { name: "Living room blinds position", hidden: true }).length).toBeGreaterThan(0));
    const at = onFader(live.container.querySelector<HTMLElement>(".fd-fader")!);
    const sends = () => live.calls.filter(({ domain, service }) => domain === "cover" && service === "set_cover_position").map(({ data }) => data.position);
    const slider = () => screen.getByRole("slider", { name: "Living room blinds position", hidden: true }) as HTMLInputElement;

    act(() => { at("pointerdown", 80); at("pointermove", 60); at("pointermove", 40); });
    expect(sends(), "nothing between press and release").toEqual([]);
    act(() => { at("pointerup", 40); });
    expect(sends(), "one set, where it was let go").toEqual([40]);
    // Held where it was let go until Home Assistant reports, then follows what it reports.
    expect(slider().value).toBe("40");
    act(() => { at("pointerdown", 40); at("pointerup", 40); });
    expect(sends(), "a press where it is sends nothing").toEqual([40]);
    expect(slider().value).toBe("40");
    act(() => live.emitEntity(ID, { attributes: { current_position: 45 } }));
    expect(slider().value).toBe("45");
    // A tap where it already is sends nothing; a tap elsewhere sends once.
    act(() => { at("pointerdown", 45); at("pointerup", 45); });
    expect(sends()).toEqual([40]);
    act(() => { at("pointerdown", 60); at("pointerup", 60); });
    expect(sends()).toEqual([40, 60]);
  });

  it("sends one set_cover_position for held keys, on key up", async () => {
    const live = renderLive();
    await waitFor(() => expect(screen.getAllByRole("slider", { name: "Living room blinds position", hidden: true }).length).toBeGreaterThan(0));
    const sends = () => live.calls.filter(({ domain, service }) => domain === "cover" && service === "set_cover_position").map(({ data }) => data.position);
    const slider = screen.getByRole("slider", { name: "Living room blinds position", hidden: true }) as HTMLInputElement;
    act(() => { fireEvent.keyDown(slider, { key: "ArrowLeft" }); });
    act(() => { fireEvent.keyDown(slider, { key: "ArrowLeft" }); });
    expect(sends(), "nothing while a key is held").toEqual([]);
    expect(slider.value).toBe("98");
    act(() => { fireEvent.keyUp(slider, { key: "ArrowLeft" }); });
    expect(sends()).toEqual([98]);
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
