import { describe, expect, it } from "vitest";
import type { HaHistoryRecord } from "./history";
import fixture from "./fixtures/history_during_period.json";
import {
  alarmHistoryFromHass,
  climateHistoryFromHass,
  coverHistoryFromHass,
  historyRecords,
  lightHistoryFromHass,
  owletHistoryFromHass,
  readingHistoryFromHass,
  sensorHistoryFromHass,
  toggleHistoryFromHass,
  vacuumHistoryFromHass,
  weatherHistoryFromHass,
} from "./history";

/** Local time helpers. `now` is fixed at 2026-10-20 12:34, current hour 12. */
const now = () => new Date(2026, 9, 20, 12, 34);
const iso = (hour: number, minute = 0) =>
  `2026-10-20T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

const record = (entityId: string, state: string, changed: string, attributes: Record<string, unknown> = {}): HaHistoryRecord => ({
  entityId,
  state,
  changed: new Date(changed),
  attributes,
});

/** One entity's records. */
const single = (records: HaHistoryRecord[]) => records;
/** Two entities' records. */
const two = (first: HaHistoryRecord[], second: HaHistoryRecord[]) => [...first, ...second];

const dimmable = { supported_color_modes: ["brightness"] };
/** Epoch seconds for a local time today, as `history/history_during_period` sends it. */
const epoch = (hour: number, minute = 0) => new Date(iso(hour, minute)).getTime() / 1000;

describe("historyRecords", () => {
  it("reads compressed rows keyed by entity id, keeping only requested entities", () => {
    const result = historyRecords(
      {
        "light.a": [{ s: "on", a: dimmable, lu: epoch(3) }, { s: "off", a: {}, lu: epoch(5) }],
        "light.b": [{ s: "on", a: {}, lu: epoch(1) }],
      },
      ["light.a"],
    );
    expect(result).toEqual([
      { entityId: "light.a", state: "on", attributes: dimmable, changed: new Date(iso(3)) },
      { entityId: "light.a", state: "off", attributes: {}, changed: new Date(iso(5)) },
    ]);
  });

  it("times a row by lu, falling back to lc, and drops rows with neither", () => {
    const result = historyRecords(
      { "light.a": [{ s: "on", lc: epoch(2) }, { s: "on", lu: "nope" }, { s: "off", lu: epoch(4), lc: epoch(1) }] },
      ["light.a"],
    );
    expect(result.map((r) => r.changed)).toEqual([new Date(iso(2)), new Date(iso(4))]);
  });

  it("carries attributes forward across minimal rows", () => {
    const result = historyRecords(
      { "light.a": [{ s: "on", a: { brightness: 128 }, lu: epoch(2) }, { s: "on", lu: epoch(3) }] },
      ["light.a"],
    );
    expect(result[1].attributes).toEqual({ brightness: 128 });
  });

  it("returns nothing for garbage responses", () => {
    expect(historyRecords(null, ["light.a"])).toEqual([]);
    expect(historyRecords("nope", ["light.a"])).toEqual([]);
    expect(historyRecords([[{ s: "on", lu: epoch(1) }]], ["light.a"])).toEqual([]);
    expect(historyRecords({ "light.a": "x" }, ["light.a"])).toEqual([]);
    expect(historyRecords({ "light.a": [42, null, "x"] }, ["light.a"])).toEqual([]);
  });

  it("coerces a missing state to unavailable", () => {
    const result = historyRecords({ "light.a": [{ lu: epoch(3) }] }, ["light.a"]);
    expect(result[0].state).toBe("unavailable");
  });
});

describe("hour walk", () => {
  it("carries the latest record from before midnight into hour 0", () => {
    const result = lightHistoryFromHass(
      [record("light.x", "off", "2026-10-19T18:00:00"), record("light.x", "on", "2026-10-19T22:00:00"), record("light.x", "off", iso(4))],
      "light.x",
      now(),
    );
    expect(result.samples.slice(0, 5)).toEqual([1, 1, 1, 1, 0]);
    expect(result.onMinutes).toBe(4 * 60);
  });

  it("ignores records after now", () => {
    const result = toggleHistoryFromHass(
      [record("switch.x", "off", iso(0)), record("switch.x", "on", iso(12, 50))],
      "switch.x",
      now(),
    );
    expect(result.samples[12]).toBe(0);
    expect(result.onMinutes).toBe(0);
  });

  it("only reads the requested entity's records", () => {
    const result = toggleHistoryFromHass(
      [record("switch.x", "off", iso(0)), record("switch.y", "on", iso(1))],
      "switch.x",
      now(),
    );
    expect(result.onMinutes).toBe(0);
  });
});

describe("vacuumHistoryFromHass", () => {
  it("counts hours cleaning, by the mapper's names for its states", () => {
    const result = vacuumHistoryFromHass(
      [record("vacuum.x", "docked", iso(0)), record("vacuum.x", "spot_cleaning", iso(9)), record("vacuum.x", "charging", iso(10)), record("vacuum.x", "cleaning", iso(12, 4))],
      "vacuum.x",
      now(),
    );
    expect(result.samples[8]).toBe(0);
    expect(result.samples[9]).toBe(1);
    expect(result.samples[10]).toBe(0);
    expect(result.samples[13]).toBeNull();
    expect(result.cleaningMinutes).toBe(60 + 34);
  });

  it("marks hours it was unreachable", () => {
    const result = vacuumHistoryFromHass([record("vacuum.x", "unavailable", iso(0)), record("vacuum.x", "error", iso(11))], "vacuum.x", now());
    expect(result.samples[3]).toBe("unavailable");
    expect(result.samples[11]).toBe(0);
  });
});

describe("lightHistoryFromHass", () => {
  it("walks transitions with brightness intensity and counts on-minutes", () => {
    const result = lightHistoryFromHass(
      single([
        record("light.lamp", "off", iso(0)),
        record("light.lamp", "on", iso(3), { ...dimmable, brightness: 128 }),
        record("light.lamp", "on", iso(5), { ...dimmable, brightness: 255 }),
        record("light.lamp", "off", iso(7)),
        record("light.lamp", "on", iso(10), { ...dimmable, brightness: 51 }),
      ]),
      "light.lamp",
      now(),
    );
    expect(result.currentHour).toBe(12);
    expect(result.samples.slice(0, 13)).toEqual([
      0, 0, 0, 0.5, 0.5, 1, 1, 0, 0, 0, 0.2, 0.2, 0.2,
    ]);
    expect(result.samples.slice(13)).toEqual(Array(11).fill(null));
    // Past on-hours 3,4,5,6,10,11 = 6 × 60, plus current minute 34.
    expect(result.onMinutes).toBe(394);
  });

  it("treats a non-dimmable light as binary 1/0", () => {
    const result = lightHistoryFromHass(
      single([record("light.porch", "off", iso(0)), record("light.porch", "on", iso(4))]),
      "light.porch",
      now(),
    );
    expect(result.samples[3]).toBe(0);
    expect(result.samples[4]).toBe(1);
    expect(result.samples[12]).toBe(1);
    expect(result.onMinutes).toBe(8 * 60 + 34); // hours 4..11 on, plus current minute
  });

  it("marks dimmable-on-without-brightness and unavailable hours unavailable", () => {
    const result = lightHistoryFromHass(
      single([
        record("light.x", "on", iso(2), { supported_color_modes: ["brightness"] }),
        record("light.x", "unavailable", iso(6)),
        record("light.x", "on", iso(8), { ...dimmable, brightness: 128 }),
      ]),
      "light.x",
      now(),
    );
    expect(result.samples.slice(2, 8)).toEqual(["unavailable", "unavailable", "unavailable", "unavailable", "unavailable", "unavailable"]);
    expect(result.samples[8]).toBe(0.5);
  });

  it("marks hours before the first record unavailable and future hours null", () => {
    const result = lightHistoryFromHass(single([record("light.x", "on", iso(4), dimmable)]), "light.x", now());
    expect(result.samples.slice(0, 4)).toEqual(["unavailable", "unavailable", "unavailable", "unavailable"]);
    expect(result.samples.slice(13)).toEqual(Array(11).fill(null));
  });

  it("returns a fully populated shape when there are no records", () => {
    for (const records of [undefined, []]) {
      const result = lightHistoryFromHass(records, "light.x", now());
      expect(result.samples).toHaveLength(24);
      expect(result.samples.slice(0, 13)).toEqual(Array(13).fill("unavailable"));
      expect(result.samples.slice(13)).toEqual(Array(11).fill(null));
      expect(result.onMinutes).toBe(0);
    }
  });
});

describe("toggleHistoryFromHass", () => {
  it("produces binary 1/0 samples and on-minutes", () => {
    const result = toggleHistoryFromHass(
      single([
        record("input_boolean.dnd", "off", iso(0)),
        record("input_boolean.dnd", "on", iso(2)),
        record("input_boolean.dnd", "off", iso(6)),
        record("input_boolean.dnd", "on", iso(9)),
      ]),
      "input_boolean.dnd",
      now(),
    );
    expect(result.samples.slice(0, 13)).toEqual([0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1]);
    expect(result.onMinutes).toBe(7 * 60 + 34);
  });
});

describe("coverHistoryFromHass", () => {
  it("carries current_position forward and falls back to state", () => {
    const result = coverHistoryFromHass(
      single([
        record("cover.blind", "closed", iso(0)),
        record("cover.blind", "open", iso(5), { current_position: 50 }),
        record("cover.blind", "open", iso(8), { current_position: 100 }),
        record("cover.blind", "closing", iso(11), { current_position: 30 }),
      ]),
      "cover.blind",
      now(),
    );
    expect(result.samples.slice(0, 13)).toEqual([0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1, 0.3, 0.3]);
  });

  it("marks unknown position and moving-without-position unavailable", () => {
    const result = coverHistoryFromHass(
      single([record("cover.x", "opening", iso(4))]),
      "cover.x",
      now(),
    );
    expect(result.samples[4]).toBe("unavailable");
    expect(result.samples.slice(13)).toEqual(Array(11).fill(null));
  });
});

describe("alarmHistoryFromHass", () => {
  it("counts armed/pending/triggered hours and armed-minutes", () => {
    const result = alarmHistoryFromHass(
      single([
        record("alarm_control_panel.home", "disarmed", iso(0)),
        record("alarm_control_panel.home", "armed_away", iso(1)),
        record("alarm_control_panel.home", "disarmed", iso(5)),
        record("alarm_control_panel.home", "armed_home", iso(10)),
      ]),
      "alarm_control_panel.home",
      now(),
    );
    expect(result.samples.slice(0, 13)).toEqual([0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1]);
    expect(result.armedMinutes).toBe(6 * 60 + 34);
  });

  it("treats pending and triggered as armed, arming/disarming as disarmed", () => {
    const result = alarmHistoryFromHass(
      single([
        record("alarm_control_panel.home", "disarmed", iso(0)),
        record("alarm_control_panel.home", "arming", iso(2)),
        record("alarm_control_panel.home", "pending", iso(3)),
        record("alarm_control_panel.home", "disarming", iso(6)),
        record("alarm_control_panel.home", "triggered", iso(7)),
      ]),
      "alarm_control_panel.home",
      now(),
    );
    expect(result.samples.slice(0, 13)).toEqual([0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1]);
  });
});

describe("climateHistoryFromHass", () => {
  it("derives running share, active-minutes, and the dominant hvac_action", () => {
    const result = climateHistoryFromHass(
      single([
        record("climate.home", "off", iso(0), { hvac_action: "off" }),
        record("climate.home", "heat", iso(2), { hvac_action: "heating" }),
        record("climate.home", "cool", iso(6), { hvac_action: "cooling" }),
        record("climate.home", "heat", iso(9), { hvac_action: "heating" }),
      ]),
      "climate.home",
      now(),
    );
    expect(result.samples.slice(0, 13)).toEqual([0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(result.activeMinutes).toBe(10 * 60 + 34);
    expect(result.activity).toBe("heating");
  });

  it("defaults activity to running when no action dominates heating or cooling", () => {
    const result = climateHistoryFromHass(
      single([record("climate.home", "heat", iso(2), { hvac_action: "idle" })]),
      "climate.home",
      now(),
    );
    expect(result.activity).toBe("running");
    expect(result.samples[2]).toBe(1);
  });

  it("marks unavailable hours unavailable without counting them as running", () => {
    const result = climateHistoryFromHass(
      single([
        record("climate.home", "heat", iso(2), { hvac_action: "heating" }),
        record("climate.home", "unavailable", iso(6)),
      ]),
      "climate.home",
      now(),
    );
    expect(result.samples[6]).toBe("unavailable");
    expect(result.activeMinutes).toBe(4 * 60); // only hours 2..5 ran
  });
});

describe("sensorHistoryFromHass", () => {
  it("carries numeric state forward and marks unavailable hours", () => {
    const result = sensorHistoryFromHass(
      two(
        [
          record("sensor.temp", "20.0", iso(0)),
          record("sensor.temp", "21.5", iso(3)),
          record("sensor.temp", "unavailable", iso(6)),
          record("sensor.temp", "22.0", iso(7)),
        ],
        [record("sensor.hum", "50", iso(0)), record("sensor.hum", "55", iso(4))],
      ),
      { temperature: "sensor.temp", humidity: "sensor.hum" },
      now(),
    );
    expect(result.currentHour).toBe(12);
    expect(result.temperature.slice(0, 13)).toEqual([
      20, 20, 20, 21.5, 21.5, 21.5, "unavailable", 22, 22, 22, 22, 22, 22,
    ]);
    expect(result.temperature.slice(13)).toEqual(Array(11).fill(null));
    expect(result.humidity?.slice(0, 13)).toEqual([50, 50, 50, 50, 55, 55, 55, 55, 55, 55, 55, 55, 55]);
  });

  it("yields null for hours before the first record and omits humidity without a second id", () => {
    const result = sensorHistoryFromHass(
      single([record("sensor.temp", "19.5", iso(5))]),
      { temperature: "sensor.temp" },
      now(),
    );
    expect(result.temperature.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(result.temperature[5]).toBe(19.5);
    expect(result.humidity).toBeUndefined();
  });
});

describe("owletHistoryFromHass", () => {
  const ids = { sleep: "sensor.sock_sleep_state", heartRate: "sensor.sock_heart_rate", oxygen: "sensor.sock_o2_saturation" };

  it("draws deep sleep full, light sleep half and awake on the baseline, and counts minutes asleep", () => {
    const result = owletHistoryFromHass(
      single([
        record(ids.sleep, "deep_sleep", iso(0)),
        record(ids.sleep, "light_sleep", iso(3)),
        record(ids.sleep, "awake", iso(6)),
        record(ids.sleep, "unknown", iso(8)),
        record(ids.sleep, "deep_sleep", iso(10)),
      ]),
      ids,
      now(),
    );
    expect(result.sleep.slice(0, 13)).toEqual([1, 1, 1, 0.5, 0.5, 0.5, 0, 0, "unavailable", "unavailable", 1, 1, 1]);
    expect(result.sleep.slice(13)).toEqual(Array(11).fill(null));
    // 00-06 asleep, 10-12 asleep, plus 34 minutes of the current hour.
    expect(result.asleepMinutes).toBe(6 * 60 + 2 * 60 + 34);
  });

  it("carries heart rate and oxygen forward, and marks charging hours unavailable", () => {
    const result = owletHistoryFromHass(
      [
        record(ids.sleep, "deep_sleep", iso(0)),
        record(ids.heartRate, "118", iso(0)),
        record(ids.heartRate, "unavailable", iso(2)),
        record(ids.heartRate, "131", iso(3)),
        record(ids.oxygen, "98", iso(1)),
      ],
      ids,
      now(),
    );
    expect(result.heartRate?.slice(0, 5)).toEqual([118, 118, "unavailable", 131, 131]);
    expect(result.oxygen?.slice(0, 3)).toEqual([null, 98, 98]);
  });

  it("omits the readings without their ids", () => {
    const result = owletHistoryFromHass(single([record(ids.sleep, "awake", iso(9))]), { sleep: ids.sleep }, now());
    expect(result.heartRate).toBeUndefined();
    expect(result.oxygen).toBeUndefined();
    expect(result.asleepMinutes).toBe(0);
  });
});

describe("readingHistoryFromHass", () => {
  it("carries one sensor's numeric state forward", () => {
    const result = readingHistoryFromHass(single([record("sensor.co2", "410", iso(1)), record("sensor.co2", "unknown", iso(3)), record("sensor.co2", "650.5", iso(4))]), "sensor.co2", now());
    expect(result.readings.slice(0, 6)).toEqual([null, 410, 410, "unavailable", 650.5, 650.5]);
    expect(result.currentHour).toBe(12);
  });
});

describe("weatherHistoryFromHass", () => {
  it("carries the temperature attribute forward; the state is a condition", () => {
    const result = weatherHistoryFromHass(
      single([
        record("weather.home", "cloudy", iso(1), { temperature: 5 }),
        record("weather.home", "sunny", iso(4), { temperature: 6.5 }),
        record("weather.home", "unavailable", iso(8)),
        record("weather.home", "sunny", iso(10)),
      ]),
      "weather.home",
      now(),
    );
    expect(result.temperature.slice(0, 13)).toEqual([null, 5, 5, 5, 6.5, 6.5, 6.5, 6.5, "unavailable", "unavailable", "unavailable", "unavailable", "unavailable"]);
    expect(result.temperature.slice(13)).toEqual(Array(11).fill(null));
  });

  it("returns all-null readings for a missing entity", () => {
    const result = weatherHistoryFromHass([], "weather.missing", now());
    expect(result.temperature).toEqual(Array(24).fill(null));
  });
});

describe("DST-day behavior", () => {
  it("still yields exactly 24 local samples on a transition day", () => {
    const transitionNow = new Date(2026, 2, 8, 12, 0); // US spring-forward Sunday
    const result = lightHistoryFromHass(
      single([record("light.x", "off", "2026-03-08T00:00:00"), record("light.x", "on", "2026-03-08T04:00:00", dimmable)]),
      "light.x",
      transitionNow,
    );
    expect(result.samples).toHaveLength(24);
    expect(result.currentHour).toBe(transitionNow.getHours());
    expect(result.samples.slice(result.currentHour + 1)).toEqual(
      Array(24 - result.currentHour - 1).fill(null),
    );
  });
});

describe("history/history_during_period wire fixture", () => {
  // Shape modeled on Home Assistant core's compressed history rows: a start-time row whose lc predates
  // the window, an attribute-only change (lu without lc), and epoch-second floats.
  it("parses every row and keeps attribute-only changes", () => {
    const records = historyRecords(fixture, ["light.living_room", "sensor.living_room_temperature"]);
    expect(records).toHaveLength(6);
    const light = records.filter((r) => r.entityId === "light.living_room");
    expect(light.map((r) => r.state)).toEqual(["off", "on", "on"]);
    expect(light.map((r) => r.attributes.brightness)).toEqual([null, 128, 255]);
    expect(light[2].changed.getTime()).toBe(1792501200750);
  });

  it("drives the light strip end to end", () => {
    const records = historyRecords(fixture, ["light.living_room"]);
    const at = new Date(1792501200750 + 30 * 60_000);
    const result = lightHistoryFromHass(records, "light.living_room", at);
    expect(result.samples[at.getHours()]).toBe(1);
    expect(result.onMinutes).toBeGreaterThan(0);
  });
});
