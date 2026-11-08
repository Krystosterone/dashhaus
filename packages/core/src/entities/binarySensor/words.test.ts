import { describe, expect, it } from "vitest";
import { ALERT_SPOKEN, ALERT_WORDS, ALERT_WORD_MAX, BINARY_SENSOR_WORDS, alertSaid, alertSentence, alertText, alertWord, isBinarySensorClass, pictureOf, stateWord, wordsOf } from "./words";
import { todaySummary } from "../today";
import { ON_SEVERITY } from "./severity";

describe("binary sensor words", () => {
  it("says the state in its device class's words", () => {
    expect(stateWord({ state: "on", deviceClass: "door" })).toBe("Open");
    expect(stateWord({ state: "off", deviceClass: "door" })).toBe("Closed");
    expect(stateWord({ state: "on", deviceClass: "moisture" })).toBe("Wet");
    expect(stateWord({ state: "off", deviceClass: "moisture" })).toBe("Dry");
    expect(stateWord({ state: "on", deviceClass: "smoke" })).toBe("Smoke");
    expect(stateWord({ state: "off", deviceClass: "smoke" })).toBe("Clear");
    expect(stateWord({ state: "on" })).toBe("On");
    expect(stateWord({ state: "unavailable", deviceClass: "door" })).toBe("Unavailable");
  });

  it("has words for every class, and a today word todaySummary reads", () => {
    for (const words of Object.values(BINARY_SENSOR_WORDS)) {
      expect(words.on).not.toBe(words.off);
      expect(words.today).toBe(words.today.toLowerCase());
    }
    expect(todaySummary(wordsOf("door").today, 42)).toBe("Open 42m");
    expect(todaySummary(wordsOf("smoke").today, 0)).toBe("Not detected today");
  });

  it("says a warning only while on, for a class that warns", () => {
    expect(alertWord({ state: "on", deviceClass: "moisture" })).toBe("Leak detected");
    expect(alertWord({ state: "off", deviceClass: "smoke" })).toBeUndefined();
    expect(alertWord({ state: "on", deviceClass: "door" })).toBeUndefined();
    for (const cls of Object.keys(ON_SEVERITY)) {
      expect(ALERT_WORDS[cls as keyof typeof ALERT_WORDS]).toBeDefined();
      expect(ALERT_SPOKEN[cls as keyof typeof ALERT_SPOKEN]).toBeDefined();
    }
  });

  it("keeps every warning's words whole on a narrow row: 13 characters at most", () => {
    expect(ALERT_WORD_MAX).toBe(13);
    for (const [cls, word] of Object.entries(ALERT_WORDS)) expect(word.length, cls).toBeLessThanOrEqual(ALERT_WORD_MAX);
  });

  it("says a garage door left open as the cover card does, with since when, and every warning whole to a screen reader", () => {
    expect(alertText({ state: "on", deviceClass: "garage_door", lastChanged: "18:30" })).toBe("Open since 18:30");
    expect(alertText({ state: "on", deviceClass: "garage_door" })).toBe("Open");
    expect(alertText({ state: "on", deviceClass: "door", lastChanged: "18:30" })).toBeUndefined();
    expect(alertText({ state: "on", deviceClass: "smoke", lastChanged: "11:52" })).toBe("Smoke alarm");
    expect(alertSentence({ state: "on", deviceClass: "carbon_monoxide", name: "Bedroom" })).toBe("Carbon monoxide detected at Bedroom");
    expect(alertSentence({ state: "on", deviceClass: "garage_door", name: "Garage", lastChanged: "18:30" })).toBe("Garage has been open since 18:30");
    expect(alertSentence({ state: "off", deviceClass: "smoke", name: "Hall" })).toBeUndefined();
    expect(alertSaid({ state: "on", deviceClass: "carbon_monoxide" })).toBe("Carbon monoxide detected");
    expect(alertSaid({ state: "on", deviceClass: "garage_door", lastChanged: "18:30" })).toBe("Open since 18:30");
    expect(alertSaid({ state: "on", deviceClass: "door", lastChanged: "18:30" })).toBeUndefined();
    expect(alertSaid({ state: "off", deviceClass: "smoke" })).toBeUndefined();
  });

  it("knows Home Assistant's classes, and nothing else", () => {
    expect(isBinarySensorClass("window")).toBe(true);
    expect(isBinarySensorClass("toString")).toBe(false);
    expect(isBinarySensorClass("doorbell")).toBe(false);
  });

  it("names a picture for each kind of sensor", () => {
    expect(pictureOf("garage_door")).toBe("door");
    expect(pictureOf("carbon_monoxide")).toBe("smoke");
    expect(pictureOf("moisture")).toBe("leak");
    expect(pictureOf("connectivity")).toBe("sensor");
    expect(pictureOf()).toBe("sensor");
  });
});
