import { hourCycleOf } from "../clock";
import type { HourCycle } from "../clock";
import { PICTURE_WORDS, stillFrom } from "../picture";
import type { CameraEntity, CameraState } from "./types";

/**
 * What a camera is doing, in words, the same on every card and in every skin (spec/cards.md → What every card says).
 * An `other` state is said in its own words (`stateText`).
 */
export const CAMERA_WORDS: Record<Exclude<CameraState, "other">, string> = {
  idle: "Idle",
  recording: "Recording",
  streaming: "Streaming",
  unavailable: "Unavailable",
};

/**
 * How often a camera's still refreshes while it is seen, in seconds, unless its card says otherwise: Home Assistant's
 * own picture cards' interval.
 */
export const STILL_REFRESH = 10;

/** What it is doing in words: "Idle", "Recording"; a state Home Assistant doesn't name as it says it. */
export function cameraWord(e: Pick<CameraEntity, "state" | "stateText">): string {
  if (e.state === "other") return e.stateText ?? "Unknown";
  return CAMERA_WORDS[e.state];
}

/**
 * The details' one way to the live stream, where the host has one: Orb's pill says it whole; Field's key, whose
 * caption has a key's places, says `Live`, and its spoken label says it whole (`liveViewSaid`).
 */
export const LIVE_VIEW = "Live view";

/** The way to the live stream, said in full for a screen reader: "Open Front door's live view". */
export const liveViewSaid = (name: string) => `Open ${name}'s live view`;

/**
 * What pressing the still does, said after what it shows: the live stream where the host has one (Home Assistant's
 * more-info), else the card's details.
 */
export const openStillWord = (live: boolean) => (live ? "Open live view" : "Open details");

/** Where a still is in its lifecycle, as `usePicture` says (`@dashhaus/core/hooks`). */
export type StillStatus = "none" | "loading" | "ready" | "stale" | "failed";

/**
 * What a card says about its still, on the line that says its state and never over the picture: `No picture` when
 * there is nothing to show (Home Assistant names none, or it failed with nothing to keep), `Still from 22:14` when the
 * frame shown isn't refreshing (a refresh failed, or a `quiet` dashboard holds it). Nothing while a still is loading
 * or fresh, while the camera is unavailable, or with its stills switched off (`still` undefined). Its time is on the
 * dashboard's hour cycle.
 */
export function stillNote(e: Pick<CameraEntity, "state">, still: { status: StillStatus; at?: number } | undefined, hourCycle: HourCycle = hourCycleOf()): string | undefined {
  if (!still || e.state === "unavailable") return undefined;
  if (still.status === "none" || still.status === "failed") return PICTURE_WORDS.none;
  if (still.status === "stale") return stillFrom(still.at, hourCycle);
  return undefined;
}

/** What it is, for the small print: "Reolink Video Doorbell · motion detection on", or "". */
export function cameraKind(e: Pick<CameraEntity, "brand" | "model" | "motionDetection">): string {
  const made = [e.brand, e.model].filter(Boolean).join(" ");
  const motion = e.motionDetection == null ? undefined : `motion detection ${e.motionDetection ? "on" : "off"}`;
  const said = [made, motion].filter(Boolean).join(" · ");
  return said.charAt(0).toUpperCase() + said.slice(1);
}
