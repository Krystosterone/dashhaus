import { describe, expect, it } from "vitest";
import { alarmCodeFor } from "./words";

describe("an alarm's keypad in words", () => {
  it("says what a code is for, after the skin's frame", () => {
    expect(alarmCodeFor({ kind: "disarm" }, { state: "armed_away" })).toBe("disarm");
    expect(alarmCodeFor({ kind: "disarm" }, { state: "arming" })).toBe("cancel arming");
    expect(alarmCodeFor({ kind: "arm", mode: "away" }, { state: "disarmed" })).toBe("arm away");
    expect(alarmCodeFor({ kind: "arm", mode: "custom_bypass" }, { state: "disarmed" })).toBe("arm custom");
  });
});
