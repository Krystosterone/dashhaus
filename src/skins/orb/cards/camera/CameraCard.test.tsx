import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CameraCard } from "./CameraCard";
import type { CameraEntity } from "@dashhaus/core/entities/camera/types";
import { PICTURE_DOORSTEP } from "@dashhaus/core/seeds/pictures";

const entity: CameraEntity = { entityId: "camera.front_door", name: "Front door", area: "Porch", state: "idle", picture: PICTURE_DOORSTEP, lastChanged: "08:16", brand: "Reolink", model: "Video Doorbell" };

describe("CameraCard", () => {
  it("is a reading: no glow, a bare icon, its class prefix", () => {
    const { container } = render(<CameraCard entity={entity} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd cm");
    expect(container.querySelector(".hd-orb--static")).not.toBeNull();
  });

  it("says its state in words and opens the details from it", () => {
    const onOpenDetails = vi.fn();
    render(<CameraCard entity={entity} onOpenDetails={onOpenDetails} />);
    screen.getByRole("button", { name: "Front door: Idle, since 08:16. Open details" }).click();
    expect(onOpenDetails).toHaveBeenCalled();
  });

  it("opens the live stream from the still where the host has one, the details from the name and the reading", () => {
    const onOpenLive = vi.fn();
    const onOpenDetails = vi.fn();
    render(<CameraCard entity={entity} onOpenLive={onOpenLive} onOpenDetails={onOpenDetails} />);
    screen.getByRole("button", { name: "Front door: Idle. Open live view" }).click();
    expect(onOpenLive).toHaveBeenCalledTimes(1);
    expect(onOpenDetails).not.toHaveBeenCalled();
    screen.getByRole("button", { name: "Front door details" }).click();
    screen.getByRole("button", { name: /since 08:16\. Open details$/ }).click();
    expect(onOpenDetails).toHaveBeenCalledTimes(2);
  });

  it("carries one raised Live view pill in the sheet where there is a stream, so stills off still reach it", () => {
    const onOpenLive = vi.fn();
    render(<CameraCard entity={entity} still={false} variant="sheet" onOpenLive={onOpenLive} />);
    screen.getByRole("button", { name: "Open Front door's live view" }).click();
    expect(onOpenLive).toHaveBeenCalledTimes(1);
  });

  it("draws no Live view pill with no stream to open, nor while unavailable", () => {
    render(<CameraCard entity={entity} variant="sheet" />);
    expect(screen.queryByText("Live view")).toBeNull();
    render(<CameraCard entity={{ ...entity, state: "unavailable" }} variant="sheet" onOpenLive={() => {}} />);
    expect(screen.queryByText("Live view")).toBeNull();
  });

  it("opens the details from the name and the still where there is no stream to open", () => {
    const onOpenDetails = vi.fn();
    render(<CameraCard entity={entity} onOpenDetails={onOpenDetails} />);
    screen.getByRole("button", { name: "Front door details" }).click();
    screen.getByRole("button", { name: "Front door: Idle. Open details" }).click();
    expect(onOpenDetails).toHaveBeenCalledTimes(2);
  });

  it("never puts a still in a compact row", () => {
    const { container } = render(<CameraCard entity={entity} footprint="compact" />);
    expect(container.querySelector(".hd-pic")).toBeNull();
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Idle");
  });

  it("draws no well and asks for nothing with its stills switched off", () => {
    const { container } = render(<CameraCard entity={entity} still={false} footprint="featured" />);
    expect(container.querySelector(".hd-pic")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("article")?.hasAttribute("data-still")).toBe(false);
  });

  it("says No picture on the status line when there is none to show, never over the picture", () => {
    const { container } = render(<CameraCard entity={{ ...entity, picture: undefined }} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("No picture");
    expect(container.querySelector(".hd-pic")?.textContent).toBe("");
  });

  it("gives a standard card's slot its width while unavailable, and hides its last state", () => {
    const { container } = render(<CameraCard entity={{ ...entity, state: "unavailable", lastSeen: "08:20" }} />);
    expect(container.querySelector(".hd-pic")).toBeNull();
    expect(container.querySelector("article")?.hasAttribute("data-still")).toBe(false);
    expect(container.querySelector(".hd-unav")?.textContent).toContain("08:20");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Unavailable");
    expect(screen.queryByText("Idle")).toBeNull();
  });

  it("keeps a featured card's dashed well with no frame while unavailable", () => {
    const { container } = render(<CameraCard entity={{ ...entity, state: "unavailable", lastSeen: "08:20" }} footprint="featured" />);
    expect(container.querySelector(".hd-pic")?.getAttribute("data-status")).toBe("unavailable");
    expect(container.querySelector("img")).toBeNull();
  });

  it("lets an integration's own word wrap rather than be cut, and keeps Home Assistant's own on one line", () => {
    const own = render(<CameraCard entity={{ ...entity, state: "other", stateText: "Motion alert" }} />).container;
    expect(own.querySelector(".cm-f")?.hasAttribute("data-own")).toBe(true);
    const idle = render(<CameraCard entity={entity} />).container;
    expect(idle.querySelector(".cm-f")?.hasAttribute("data-own")).toBe(false);
  });

  it("says what the camera is in the sheet's small print, after when it last changed", () => {
    render(<CameraCard entity={{ ...entity, motionDetection: true }} variant="sheet" />);
    expect(screen.getByText("Last changed 08:16")).toBeTruthy();
    expect(screen.getByText("Reolink Video Doorbell · motion detection on")).toBeTruthy();
  });
});
