/**
 * Every card's warning words fit a row: 13 characters at most (spec/cards.md → What every card says), so a 340 px
 * Field row and an Orb compact row keep the word that matters. Each card's words are its model's, here in core; this
 * holds them all to the one limit, worst-case figures included. The spoken label may say the whole sentence.
 */
import { describe, expect, it } from "vitest";
import { WARNING_WORD_MAX } from "./severity";
import { batteryText } from "./battery";
import { alarmWarning } from "./alarm/words";
import { ALERT_WORDS, alertText, alertWord } from "./binarySensor/words";
import { momentWords } from "./clock";
import type { HourCycle } from "./clock";
import { LEFT_OPEN_WORD, leftOpenText } from "./cover/words";
import { LOCK_WORD } from "./lock/words";
import { ALERT_WORD, staleText, staleWarning } from "./owlet/readings";
import { vacuumWarning } from "./vacuum/words";
import { weatherWarnings } from "./weather/readings";
import type { WeatherEntity } from "./weather/types";

const weather: WeatherEntity = { entityId: "weather.home", name: "Home", state: "cloudy", temperatureUnit: "°C", windSpeedUnit: "km/h", pressureUnit: "hPa" };

const NOW = new Date(2026, 9, 17, 11, 54);
/** The longest moments a mapper writes, on each hour cycle: a day and a time, a time alone. */
const moments = (cycle: HourCycle) => [new Date(2026, 9, 16, 18, 30), new Date(2026, 9, 17, 11, 49), new Date(2026, 9, 12, 23, 58)].map((d) => momentWords(d, NOW, cycle));
const CYCLES: HourCycle[] = ["h23", "h12"];

/**
 * Warnings that say a time: on either hour cycle, the line leads with its word and the time follows it, so a clipped
 * line keeps the word ([what, word, line]).
 */
const timed = (cycle: HourCycle): [string, string, string][] => moments(cycle).flatMap((at): [string, string, string][] => [
  ["owlet stale", staleWarning(at).word, staleText(at)],
  ["cover left open", LEFT_OPEN_WORD, leftOpenText(at)],
  ["binary sensor garage door", alertWord({ state: "on", deviceClass: "garage_door" })!, alertText({ state: "on", deviceClass: "garage_door", lastChanged: at })!],
]);

const words: [string, string][] = [
  ...Object.entries(ALERT_WORDS).map(([cls, word]): [string, string] => [`binary sensor ${cls}`, word!]),
  ...Object.entries(ALERT_WORD).map(([alert, word]): [string, string] => [`owlet ${alert}`, word]),
  ...CYCLES.flatMap((cycle) => timed(cycle).map(([what, word]): [string, string] => [`${what} (${cycle})`, word])),
  ["cover left open", LEFT_OPEN_WORD],
  ["lock jammed", LOCK_WORD.jammed],
  ["low battery", batteryText(100)],
  ["vacuum error", vacuumWarning({ state: "error" })!],
  ["vacuum low battery", vacuumWarning({ state: "idle", battery: 15 })!],
  ...[
    alarmWarning({ state: "triggered", triggeredBy: "Basement egress window (north)" }),
    alarmWarning({ state: "pending", triggeredBy: "Front door" }),
    alarmWarning({ state: "disarmed", openSensors: ["Back door"] }),
    alarmWarning({ state: "disarmed", openSensors: Array.from({ length: 12 }, (_, i) => `Window ${i}`) }),
  ].map((w): [string, string] => ["alarm", w!.word]),
  ...[
    { aqi: 101 }, { aqi: 201 }, { aqi: 999 }, { windGustSpeed: 199 }, { uvIndex: 8 }, { uvIndex: 15 },
  ].flatMap((over) => weatherWarnings({ ...weather, ...over }).map((word): [string, string] => ["weather", word])),
];

describe("every card's warning words", () => {
  it("are 13 characters at most, so a row keeps them whole", () => {
    expect(WARNING_WORD_MAX).toBe(13);
    expect(words.length).toBeGreaterThan(30);
    for (const [what, word] of words) expect(word.length, `${what}: ${word}`).toBeLessThanOrEqual(WARNING_WORD_MAX);
  });

  it.each(CYCLES)("lead a line that says a time with the word, the time after it, on %s", (cycle) => {
    for (const [what, word, line] of timed(cycle)) {
      expect(line.startsWith(`${word} `), `${what}: ${line}`).toBe(true);
      expect(line.slice(word.length), `${what}: ${line}`).toMatch(/\d{1,2}:\d{2}/);
    }
  });
});
