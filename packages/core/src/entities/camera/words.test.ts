import { describe, expect, it } from "vitest";
import { stillFrom } from "../picture";
import { inWords } from "../format";
import { CAMERA_WORDS, cameraKind, cameraWord, stillNote } from "./words";

describe("camera words", () => {
  it("says each of Home Assistant's states in one word, Title case", () => {
    expect(cameraWord({ state: "idle" })).toBe("Idle");
    expect(cameraWord({ state: "recording" })).toBe("Recording");
    expect(cameraWord({ state: "streaming" })).toBe("Streaming");
    expect(cameraWord({ state: "unavailable" })).toBe("Unavailable");
    expect(Object.values(CAMERA_WORDS).every((w) => /^[A-Z][a-z]+$/.test(w))).toBe(true);
  });

  it("says a state Home Assistant doesn't name in its own words", () => {
    expect(cameraWord({ state: "other", stateText: inWords("motion_alert") })).toBe("Motion alert");
    expect(cameraWord({ state: "other" })).toBe("Unknown");
  });

  it("says No picture when there is none to show, and when a still is from while it isn't refreshing", () => {
    const at = new Date(2026, 10, 7, 22, 14).getTime();
    expect(stillNote({ state: "idle" }, { status: "none" })).toBe("No picture");
    expect(stillNote({ state: "idle" }, { status: "failed" })).toBe("No picture");
    expect(stillNote({ state: "idle" }, { status: "stale", at })).toBe(stillFrom(at));
    expect(stillFrom(at)).toMatch(/^Still from /);
    expect(stillNote({ state: "idle" }, { status: "ready", at })).toBeUndefined();
    expect(stillNote({ state: "idle" }, { status: "loading" })).toBeUndefined();
  });

  it("says nothing of a still while unavailable or with stills switched off", () => {
    expect(stillNote({ state: "unavailable" }, { status: "none" })).toBeUndefined();
    expect(stillNote({ state: "idle" }, undefined)).toBeUndefined();
  });

  it("says what the camera is, maker and model first", () => {
    expect(cameraKind({ brand: "Reolink", model: "Video Doorbell", motionDetection: true })).toBe("Reolink Video Doorbell · motion detection on");
    expect(cameraKind({ motionDetection: false })).toBe("Motion detection off");
    expect(cameraKind({})).toBe("");
  });
});
