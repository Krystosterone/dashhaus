import { describe, expect, it } from "vitest";
import { DashboardConfigError, parseDashboardConfig, suggest } from "./config";

const problems = (raw: unknown) => {
  try {
    parseDashboardConfig(raw);
  } catch (error) {
    if (error instanceof DashboardConfigError) return error.problems;
    throw error;
  }
  return [];
};

describe("parseDashboardConfig", () => {
  it("leaves the layout to the automatic one when sections are left out", () => {
    expect(parseDashboardConfig({ type: "custom:home-dashboard" })).toEqual({
      title: "Home", subtitle: undefined, showTime: false, hourCycle: undefined, theme: "home-assistant", accent: undefined, blocks: undefined,
    });
  });

  it("picks each card's widget from its entity's domain", () => {
    const config = parseDashboardConfig({
      sections: [{ title: "All", cards: ["light.a", "climate.a", "sensor.a", "weather.a", "cover.a", "input_boolean.a", "switch.a", "alarm_control_panel.a"] }],
    });
    const section = config.blocks?.[0];
    expect(section?.kind === "section" && section.items.map((i) => ("entity" in i ? [i.kind, i.entity] : i.kind))).toEqual([
      ["light", "light.a"], ["climate", "climate.a"], ["sensor", "sensor.a"], ["weather", "weather.a"],
      ["cover", "cover.a"], ["toggle", "input_boolean.a"], ["toggle", "switch.a"], ["alarm", "alarm_control_panel.a"],
    ]);
  });

  it("picks a shared widget from the entity id or from widget:", () => {
    const config = parseDashboardConfig({
      sections: [{ cards: [
        "sensor.owlet_sock_ac0_sleep_state",
        { entity: "sensor.nova", widget: "owlet", heart_rate: "sensor.nova_bpm", oxygen: "sensor.nova_spo2", charging: "binary_sensor.nova_dock", stale_after: 5 },
        { entity: "sensor.odd_sleep_state", widget: "sensor" },
        { entity: "sensor.ben", widget: "owlet", alerts: { low_oxygen: "binary_sensor.ben_spo2_low", sock_off: "binary_sensor.ben_off" } },
      ] }],
    });
    expect(config.blocks?.[0]).toMatchObject({
      items: [
        { kind: "owlet", entity: "sensor.owlet_sock_ac0_sleep_state" },
        { kind: "owlet", entity: "sensor.nova", heartRate: "sensor.nova_bpm", oxygen: "sensor.nova_spo2", charging: "binary_sensor.nova_dock", staleAfter: 5 },
        { kind: "sensor", entity: "sensor.odd_sleep_state" },
        { kind: "owlet", alerts: { low_oxygen: "binary_sensor.ben_spo2_low", sock_off: "binary_sensor.ben_off" } },
      ],
    });
  });

  it("draws a switch as a sound only with widget:, with its volume number", () => {
    const config = parseDashboardConfig({
      sections: [{ cards: [
        "switch.nursery_music",
        { entity: "switch.nursery_music", widget: "sound" },
        { entity: "switch.noise", widget: "sound", volume: "number.noise_level" },
      ] }],
    });
    expect(config.blocks?.[0]).toMatchObject({
      items: [
        { kind: "toggle", entity: "switch.nursery_music" },
        { kind: "sound", entity: "switch.nursery_music", volume: undefined },
        { kind: "sound", entity: "switch.noise", volume: "number.noise_level" },
      ],
    });
    expect(problems({ sections: [{ cards: [{ entity: "switch.noise", widget: "sound", volume: "sensor.noise_level" }] }] })).toEqual([
      "sections[0].cards[0] (switch.noise).volume: sensor.noise_level must be a number.* entity",
    ]);
  });

  it("checks an owlet's alert sensors by alert name and domain", () => {
    expect(problems({ sections: [{ cards: [
      { entity: "sensor.a_sleep_state", alerts: { low_oxygn: "binary_sensor.a", sock_off: "sensor.a_off" } },
      { entity: "sensor.b_sleep_state", alerts: ["binary_sensor.b"] },
    ] }] })).toEqual([
      'sections[0].cards[0] (sensor.a_sleep_state).alerts: unknown key "low_oxygn" — did you mean "low_oxygen"?',
      "sections[0].cards[0] (sensor.a_sleep_state).alerts.sock_off: sensor.a_off must be a binary_sensor.* entity",
      'sections[0].cards[1] (sensor.b_sleep_state): "alerts" must map alerts to binary_sensor.* entities, like low_oxygen: binary_sensor.sock_low_oxygen',
    ]);
  });

  it("only offers widget: the widgets of the entity's domain", () => {
    expect(problems({ sections: [{ cards: [{ entity: "light.a", widget: "owlet" }, { entity: "sensor.a", widget: "owlett" }] }] })).toEqual([
      'sections[0].cards[0] (light.a): "widget" must be one of "light"',
      expect.stringMatching(/^sections\[0\]\.cards\[1\] \(sensor\.a\): "widget" must be one of "sensor", "owlet"(, .*)? — did you mean "owlet"\?$/),
    ]);
  });

  it("maps snake_case options onto the tile's settings", () => {
    const config = parseDashboardConfig({
      title: "Flat",
      show_time: true,
      hour_cycle: "h23",
      viewing: "far",
      theme: "dark",
      accent: "sage",
      sections: [{
        title: "Air",
        columns: 2,
        cards: [
          { entity: "sensor.t", humidity: "sensor.h", battery: "sensor.b", footprint: "compact", span: 2, show_control: false, history: false },
          { entity: "weather.home", aqi: "sensor.aqi", aqi_scale: "US", forecasts: false },
          { entity: "switch.fan", icon: "waves", color: "rose", description: "Ceiling fan" },
          { entity: "alarm_control_panel.house", read_only: true, exit_delay: 30, open_sensors: ["Back door"] },
        ],
      }],
    });
    expect(config).toMatchObject({ title: "Flat", showTime: true, hourCycle: "h23", viewing: "far", theme: "dark", accent: { chroma: 0.08, hue: 150 } });
    expect(config.blocks?.[0]).toMatchObject({
      kind: "section",
      title: "Air",
      columns: 2,
      items: [
        { kind: "sensor", entity: "sensor.t", humidity: "sensor.h", battery: "sensor.b", footprint: "compact", span: 2, showControl: false, history: false },
        { kind: "weather", aqi: "sensor.aqi", aqiScale: "US", sun: "sun.sun", forecasts: false },
        { kind: "toggle", domain: "switch", icon: "waves", color: "rose", description: "Ceiling fan" },
        { kind: "alarm", readOnly: true, exitDelay: 30, openSensors: ["Back door"] },
      ],
    });
  });

  it("reads bundles, untitled grids and side-by-side sections", () => {
    const config = parseDashboardConfig({
      sections: [
        { cards: [{ joined: ["input_boolean.a", "input_boolean.b"], label: "Sleep", span: 2 }] },
        { columns: 2, sections: [{ title: "A", cards: [{ lead: "light.n", rows: ["switch.noise"] }] }, { title: "B", cards: ["light.b"] }] },
      ],
    });
    expect(config.blocks).toMatchObject([
      { kind: "section", title: undefined, items: [{ kind: "joined", label: "Sleep", span: 2, members: [{ entity: "input_boolean.a" }, { entity: "input_boolean.b" }] }] },
      { kind: "columns", columns: 2, sections: [{ title: "A", items: [{ kind: "lead", lead: { entity: "light.n" }, rows: [{ entity: "switch.noise" }] }] }, { title: "B" }] },
    ]);
  });

  it("lists every problem with its path and the key or value that was probably meant", () => {
    expect(problems({
      titel: "Home",
      theme: "drak",
      sections: [
        { title: "A", cards: [{ entity: "sensor.t", humdity: "sensor.h" }, "lamp", "media_player.tv", { entity: "light.a", footprint: "huge" }] },
        { title: "B" },
      ],
    })).toEqual([
      'unknown key "titel" — did you mean "title"?',
      'sections[0].cards[0] (sensor.t): unknown key "humdity" — did you mean "humidity"?',
      'sections[0].cards[1]: "lamp" is not an entity id like light.kitchen',
      expect.stringContaining("sections[0].cards[2]: media_player.tv: media_player.* entities have no widget yet"),
      'sections[0].cards[3] (light.a): "footprint" must be one of "compact", "standard", "featured"',
      'sections[1]: "cards" must be a list of at least one card',
      '"theme" must be one of "home-assistant", "auto", "light", "dark" — did you mean "dark"?',
    ]);
  });

  it("rejects companions from the wrong domain", () => {
    expect(problems({ sections: [{ cards: [{ entity: "weather.home", sun: "sensor.sun" }] }] })).toEqual([
      "sections[0].cards[0] (weather.home).sun: sensor.sun must be a sun.* entity",
    ]);
  });
});

describe("suggest", () => {
  it("offers a near word and nothing for a far one", () => {
    expect(suggest("colour", ["color", "unit"])).toBe("color");
    expect(suggest("banana", ["color", "unit"])).toBeUndefined();
  });
});
