/**
 * Every card's warning words fit a row: 13 characters at most (spec/cards.md → What every card says), so a 340 px
 * Field row and an Orb compact row keep the word that matters. Each card's words are its model's, here in core; this
 * holds them all to the one limit, worst-case figures included. The spoken label may say the whole sentence.
 */
import { describe, expect, it } from "vitest";
import { WARNING_WORD_MAX } from "./severity";
import { batteryText } from "./battery";
import { alarmWarning } from "./alarm/words";
import { ALERT_WORDS } from "./binarySensor/words";
import { LEFT_OPEN_WORD } from "./cover/words";
import { LOCK_WORD } from "./lock/words";
import { ALERT_WORD, staleText } from "./owlet/readings";
import { vacuumWarning } from "./vacuum/words";
import { weatherWarnings } from "./weather/readings";
import type { WeatherEntity } from "./weather/types";

const weather: WeatherEntity = { entityId: "weather.home", name: "Home", state: "cloudy", temperatureUnit: "°C", windSpeedUnit: "km/h", pressureUnit: "hPa" };

const words: [string, string][] = [
  ...Object.entries(ALERT_WORDS).map(([cls, word]): [string, string] => [`binary sensor ${cls}`, word!]),
  ...Object.entries(ALERT_WORD).map(([alert, word]): [string, string] => [`owlet ${alert}`, word]),
  ["owlet stale", staleText("Fri 18:30")],
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
});
