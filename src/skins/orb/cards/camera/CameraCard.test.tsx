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

  it("opens the live stream from the name and the still where the host has one, the details from the reading", () => {
    const onOpenLive = vi.fn();
    const onOpenDetails = vi.fn();
    render(<CameraCard entity={entity} onOpenLive={onOpenLive} onOpenDetails={onOpenDetails} />);
    screen.getByRole("button", { name: "Front door live view" }).click();
    screen.getByRole("button", { name: "Front door: Idle. Open live view" }).click();
    expect(onOpenLive).toHaveBeenCalledTimes(2);
    expect(onOpenDetails).not.toHaveBeenCalled();
    screen.getByRole("button", { name: /Open details$/ }).click();
    expect(onOpenDetails).toHaveBeenCalled();
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

  it("draws the dashed well with no frame while unavailable, and hides its last state", () => {
    const { container } = render(<CameraCard entity={{ ...entity, state: "unavailable", lastSeen: "08:20" }} />);
    expect(container.querySelector(".hd-pic")?.getAttribute("data-status")).toBe("unavailable");
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".hd-area")?.textContent).toBe("Unavailable");
    expect(screen.queryByText("Idle")).toBeNull();
  });

  it("says what the camera is in the sheet's small print, after when it last changed", () => {
    render(<CameraCard entity={{ ...entity, motionDetection: true }} variant="sheet" />);
    expect(screen.getByText("Last changed 08:16")).toBeTruthy();
    expect(screen.getByText("Reolink Video Doorbell · motion detection on")).toBeTruthy();
  });
});
