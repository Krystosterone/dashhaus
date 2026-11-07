import { describe, expect, it } from "vitest";
import { ARMED_LABEL, mmss, modeChoices, needsCode } from "./modes";
import { alarmSeverity } from "./severity";
import { alarmWarning, listOf, openSentence, warningLine } from "./words";

describe("modeChoices", () => {
  it("puts Off before the panel's modes", () => {
    expect(modeChoices(["home", "away"], "off")).toEqual(["off", "home", "away"]);
  });

  it("keeps a mode the panel was armed in from elsewhere, so it never reads as Off", () => {
    expect(modeChoices(["home", "away"], "custom_bypass")).toEqual(["off", "home", "away", "custom_bypass"]);
  });
});

describe("needsCode", () => {
  it("asks for nothing without a code format", () => {
    expect(needsCode({ codeFormat: null }, { kind: "disarm" })).toBe(false);
  });

  it("asks to arm too unless the integration says it needn't, as Home Assistant does", () => {
    expect(needsCode({ codeFormat: "number" }, { kind: "arm", mode: "away" })).toBe(true);
    expect(needsCode({ codeFormat: "number", codeArmRequired: false }, { kind: "arm", mode: "away" })).toBe(false);
    expect(needsCode({ codeFormat: "number", codeArmRequired: false }, { kind: "disarm" })).toBe(true);
  });
});

describe("mmss", () => {
  it("prints minutes and two places of seconds, rounding a part second up", () => {
    expect(mmss(42)).toBe("0:42");
    expect(mmss(600)).toBe("10:00");
    expect(mmss(0.2)).toBe("0:01");
    expect(mmss(-3)).toBe("0:00");
  });
});

describe("alarmSeverity", () => {
  it("makes triggered the alarm, and the entry delay urgent", () => {
    expect(alarmSeverity({ state: "triggered" })).toBe("alarm");
    expect(alarmSeverity({ state: "pending" })).toBe("urgent");
  });
  it("leaves doors open while disarmed advisory, and the rest at nothing", () => {
    expect(alarmSeverity({ state: "disarmed", openSensors: ["Back door"] })).toBe("advisory");
    expect(alarmSeverity({ state: "disarmed", openSensors: [] })).toBeUndefined();
    expect(alarmSeverity({ state: "armed_away", openSensors: ["Back door"] })).toBeUndefined();
    expect(alarmSeverity({ state: "arming" })).toBeUndefined();
  });
});

describe("alarm words", () => {
  it("says each armed mode in Title case, short enough for a row (spec/cards.md → state words)", () => {
    expect(ARMED_LABEL.custom_bypass).toBe("Armed custom");
    for (const label of Object.values(ARMED_LABEL)) expect(label.length).toBeLessThanOrEqual(14);
  });

  it("says its warning's word first, the sensor after it, and the whole sentence aloud", () => {
    const triggered = alarmWarning({ state: "triggered", triggeredBy: "Back door" })!;
    expect(triggered).toEqual({ word: "Triggered", detail: "Back door", said: "Triggered by Back door" });
    expect(alarmWarning({ state: "pending", triggeredBy: "Front door" })).toEqual({ word: "Entry delay", detail: "Front door", said: "Entry delay, Front door opened" });
    const open = alarmWarning({ state: "disarmed", openSensors: ["Back door", "Kitchen window"] })!;
    expect(open).toEqual({ word: "2 open", detail: "Back door, Kitchen window", said: "Back door and Kitchen window are open" });
    expect(alarmWarning({ state: "disarmed", openSensors: ["Back door"] })?.word).toBe("Open");
    expect(alarmWarning({ state: "armed_away", openSensors: ["Back door"] })).toBeUndefined();
    expect(alarmWarning({ state: "unavailable" })).toBeUndefined();
    expect(warningLine(triggered)).toBe("Triggered · Back door");
    expect(warningLine({ word: "Triggered" })).toBe("Triggered");
  });

  it("lists what is open in a sentence", () => {
    expect(listOf(["Hall", "Back door", "Kitchen window"])).toBe("Hall, Back door and Kitchen window");
    expect(openSentence(["Back door"])).toBe("Back door is open.");
  });
});
