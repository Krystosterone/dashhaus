import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MediaPlayerCard } from "./MediaPlayerCard";
import { MEDIA_PLAYER_SEEDS } from "@dashhaus/core/seeds/mediaPlayer";
import type { MediaPlayerEntity } from "@dashhaus/core/entities/mediaPlayer/types";

const playing: MediaPlayerEntity = MEDIA_PLAYER_SEEDS.playing.entity;
const press = () => ({ onPlay: vi.fn(), onPause: vi.fn(), onTurnOn: vi.fn() });

describe("MediaPlayerCard", () => {
  it("is a state: the accent while playing, never a glow", () => {
    const { container } = render(<MediaPlayerCard entity={playing} {...press()} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("state");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd mp");
    expect(screen.getByRole("button", { name: /^Kitchen speaker: Playing · Pause/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("is the accent while on with nothing to play (a TV showing an input), as a light that is on", () => {
    const { container } = render(<MediaPlayerCard entity={MEDIA_PLAYER_SEEDS.on.entity} {...press()} onTurnOff={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Den TV: On · Turn off/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Turn off Den TV" }).getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe("on");
  });

  it("rests while paused: the pill is raised, not the accent", () => {
    render(<MediaPlayerCard entity={MEDIA_PLAYER_SEEDS.paused.entity} {...press()} />);
    expect(screen.getByRole("button", { name: /^Living room: Paused · Play/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("says since when, not the slot's word again, where it has nothing else to say", () => {
    const bare: MediaPlayerEntity = { entityId: "media_player.x", name: "X", state: "playing", lastChanged: "11:40" };
    const { container } = render(<MediaPlayerCard entity={bare} {...press()} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Since 11:40");
  });

  it("says what is playing on the status line, the title first", () => {
    const { container } = render(<MediaPlayerCard entity={playing} {...press()} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Sunday Morning · Maroon 5");
  });

  it("pauses what plays, plays what doesn't, and turns on what is off, from the orb and the pill", () => {
    const h = press();
    const { rerender } = render(<MediaPlayerCard entity={playing} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause Kitchen speaker" }));
    fireEvent.click(screen.getByRole("button", { name: /^Kitchen speaker: Playing · Pause/ }));
    expect(h.onPause).toHaveBeenCalledTimes(2);
    rerender(<MediaPlayerCard entity={{ ...playing, state: "paused" }} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: /^Kitchen speaker: Paused · Play/ }));
    expect(h.onPlay).toHaveBeenCalledTimes(1);
    rerender(<MediaPlayerCard entity={{ ...playing, state: "standby" }} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Turn on Kitchen speaker" }));
    expect(h.onTurnOn).toHaveBeenCalledTimes(1);
  });

  it("shows its state with nothing to press where it can't do the press", () => {
    const { container } = render(<MediaPlayerCard entity={{ ...playing, supportsPause: false, supportsTurnOff: false }} {...press()} />);
    expect(container.querySelector(".mp-st")?.textContent).toBe("Playing");
  });

  it("says Muted after what is playing", () => {
    const { container } = render(<MediaPlayerCard entity={{ ...playing, muted: true }} {...press()} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Sunday Morning · Maroon 5 · Muted");
  });

  it("draws the artwork and how far in when featured, and neither on a standard card", () => {
    const { container, rerender } = render(<MediaPlayerCard entity={playing} {...press()} />);
    expect(container.querySelector(".hd-pic")).toBeNull();
    expect(container.querySelector(".mp-prog")).toBeNull();
    rerender(<MediaPlayerCard entity={playing} footprint="featured" {...press()} />);
    expect(screen.getByRole("img", { name: "Artwork for Sunday Morning" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "1 minute 23 seconds of 4 minutes 5 seconds" })).toBeTruthy();
    expect(container.querySelector(".hd-area")?.textContent).toBe("Kitchen · Spotify");
  });

  it("draws no progress line and no clock under a quiet dashboard", () => {
    const { container } = render(<MediaPlayerCard entity={playing} footprint="featured" quiet {...press()} />);
    expect(container.querySelector(".mp-title")?.textContent).toBe("Sunday Morning");
    expect(container.querySelector(".mp-prog")).toBeNull();
  });

  it("fills the volume groove only while it plays and is not muted, saying why it doesn't", () => {
    const sheet = (entity: MediaPlayerEntity) => render(<MediaPlayerCard entity={entity} variant="sheet" {...press()} onVolumeChange={vi.fn()} />);
    const { unmount } = sheet(MEDIA_PLAYER_SEEDS.paused.entity);
    expect(screen.getAllByText("Paused · 30%").length).toBeGreaterThan(0);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("30 percent, paused");
    unmount();
    const muted = sheet(MEDIA_PLAYER_SEEDS.muted.entity);
    expect(screen.getAllByText("Muted · 60%").length).toBeGreaterThan(0);
    muted.unmount();
    sheet(playing);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("45 percent");
  });

  it("draws no progress for a stream with no duration, and no well without artwork", () => {
    const { container } = render(<MediaPlayerCard entity={MEDIA_PLAYER_SEEDS.stream.entity} footprint="featured" {...press()} />);
    expect(container.querySelector(".mp-title")?.textContent).toBe("BBC Radio 6 Music");
    expect(container.querySelector(".mp-prog")).toBeNull();
    expect(container.querySelector(".hd-pic")).toBeNull();
  });

  it("offers skip, volume, sound, source and turning off in the sheet, each where it is supported", () => {
    const h = { ...press(), onPrevious: vi.fn(), onNext: vi.fn(), onTurnOff: vi.fn(), onVolumeChange: vi.fn(), onMuteChange: vi.fn(), onSourceChange: vi.fn() };
    render(<MediaPlayerCard entity={playing} variant="sheet" {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Kitchen speaker: next track" }));
    fireEvent.click(screen.getByRole("button", { name: "Kitchen speaker: previous track" }));
    fireEvent.click(screen.getByRole("button", { name: "On" }));
    fireEvent.click(screen.getByRole("button", { name: "Radio" }));
    fireEvent.click(screen.getByRole("button", { name: "Turn Kitchen speaker off" }));
    expect(h.onNext).toHaveBeenCalled();
    expect(h.onPrevious).toHaveBeenCalled();
    expect(h.onMuteChange).toHaveBeenCalledWith(true);
    expect(h.onSourceChange).toHaveBeenCalledWith("Radio");
    expect(h.onTurnOff).toHaveBeenCalled();
    expect(screen.getByRole("slider")).toBeTruthy();
  });

  it("offers nothing a player doesn't support", () => {
    const bare: MediaPlayerEntity = { entityId: "media_player.x", name: "X", state: "paused", title: "Die Moldau" };
    const h = { ...press(), onPrevious: vi.fn(), onNext: vi.fn(), onTurnOff: vi.fn(), onVolumeChange: vi.fn(), onMuteChange: vi.fn(), onSourceChange: vi.fn() };
    render(<MediaPlayerCard entity={bare} variant="sheet" {...h} />);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: /next track/ })).toBeNull();
    expect(screen.getByText("View only")).toBeTruthy();
  });

  it("says Unavailable, draws no artwork and ignores the orb while unavailable", () => {
    const h = press();
    const { container } = render(<MediaPlayerCard entity={{ ...playing, state: "unavailable", lastSeen: "08:20" }} footprint="featured" {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Kitchen speaker: Unavailable" }));
    expect(h.onPause).not.toHaveBeenCalled();
    expect(screen.getByText("Last seen 08:20")).toBeTruthy();
    expect(container.querySelector(".hd-pic")).toBeNull();
  });

  it("keeps one state cue in the compact row", () => {
    const { container } = render(<MediaPlayerCard entity={{ ...playing, state: "off" }} footprint="compact" {...press()} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Off");
  });
});
