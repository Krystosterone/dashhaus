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

  it("picks each card from its entity's domain", () => {
    const config = parseDashboardConfig({
      sections: [{ title: "All", cards: ["light.a", "climate.a", "sensor.a", "weather.a", "cover.a", "input_boolean.a", "switch.a", "alarm_control_panel.a"] }],
    });
    const section = config.blocks?.[0];
    expect(section?.kind === "section" && section.items.map((i) => ("entity" in i ? [i.kind, i.entity] : i.kind))).toEqual([
      ["light", "light.a"], ["climate", "climate.a"], ["sensor", "sensor.a"], ["weather", "weather.a"],
      ["cover", "cover.a"], ["toggle", "input_boolean.a"], ["toggle", "switch.a"], ["alarm", "alarm_control_panel.a"],
    ]);
  });

  it("picks a shared card from the entity id or from card:", () => {
    const config = parseDashboardConfig({
      sections: [{ cards: [
        "sensor.owlet_sock_ac0_sleep_state",
        { entity: "sensor.nova", card: "owlet", heart_rate: "sensor.nova_bpm", oxygen: "sensor.nova_spo2", charging: "binary_sensor.nova_dock", base_station: "switch.nova_base", stale_after: 5 },
        { entity: "sensor.odd_sleep_state", card: "sensor" },
        { entity: "sensor.ben", card: "owlet", alerts: { low_oxygen: "binary_sensor.ben_spo2_low", sock_off: "binary_sensor.ben_off" } },
      ] }],
    });
    expect(config.blocks?.[0]).toMatchObject({
      items: [
        { kind: "owlet", entity: "sensor.owlet_sock_ac0_sleep_state" },
        { kind: "owlet", entity: "sensor.nova", heartRate: "sensor.nova_bpm", oxygen: "sensor.nova_spo2", charging: "binary_sensor.nova_dock", baseStation: "switch.nova_base", staleAfter: 5 },
        { kind: "sensor", entity: "sensor.odd_sleep_state" },
        { kind: "owlet", alerts: { low_oxygen: "binary_sensor.ben_spo2_low", sock_off: "binary_sensor.ben_off" } },
      ],
    });
  });

  it("draws a switch as a sound only with card:, with its volume number", () => {
    const config = parseDashboardConfig({
      sections: [{ cards: [
        "switch.nursery_music",
        { entity: "switch.nursery_music", card: "sound" },
        { entity: "switch.noise", card: "sound", volume: "number.noise_level" },
      ] }],
    });
    expect(config.blocks?.[0]).toMatchObject({
      items: [
        { kind: "toggle", entity: "switch.nursery_music" },
        { kind: "sound", entity: "switch.nursery_music", volume: undefined },
        { kind: "sound", entity: "switch.noise", volume: "number.noise_level" },
      ],
    });
    expect(problems({ sections: [{ cards: [{ entity: "switch.noise", card: "sound", volume: "sensor.noise_level" }] }] })).toEqual([
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

  it("only offers card: the cards of the entity's domain", () => {
    expect(problems({ sections: [{ cards: [{ entity: "light.a", card: "owlet" }, { entity: "sensor.a", card: "owlett" }] }] })).toEqual([
      'sections[0].cards[0] (light.a): "card" must be one of "light"',
      expect.stringMatching(/^sections\[0\]\.cards\[1\] \(sensor\.a\): "card" must be one of "sensor", "owlet"(, .*)? — did you mean "owlet"\?$/),
    ]);
  });

  it("no longer reads widget:, card:'s old name", () => {
    expect(problems({ sections: [{ cards: [{ entity: "sensor.nova", widget: "owlet" }] }] })).toEqual([
      expect.stringMatching(/^sections\[0\]\.cards\[0\] \(sensor\.nova\): unknown key "widget"/),
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

  it("reads a titled bundle: what its rows make up, its room, and the rows", () => {
    const config = parseDashboardConfig({ sections: [{ title: "Quick", cards: [{
      title: "Sound machine", area: "Baby Room", span: 2,
      rows: [{ entity: "switch.nursery", name: "Power", icon: "power" }, "light.nursery", { entity: "switch.nursery_music", card: "sound" }],
    }] }] });
    expect(config.blocks?.[0]).toMatchObject({ items: [{
      kind: "titled", title: "Sound machine", area: "Baby Room", span: 2,
      rows: [{ kind: "toggle", name: "Power", icon: "power" }, { kind: "light" }, { kind: "sound" }],
    }] });
    expect(problems({ sections: [{ cards: [{ rows: ["light.a"] }, { title: "T", rows: ["light.a"], lid: "x" }] }] })).toEqual([
      'sections[0].cards[0]: a bundle with "rows" needs a "lead" card, or a "title" naming what its rows make up',
      'sections[0].cards[1]: unknown key "lid"',
    ]);
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
      expect.stringContaining("sections[0].cards[2]: media_player.tv: media_player.* entities have no card yet"),
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

describe("nav and pages", () => {
  const sections = [{ title: "Quick actions", cards: ["light.a"] }, { title: "Home status", cards: ["climate.a"] }];

  it("reads pages and a nav of sections, pages and other dashboards", () => {
    const config = parseDashboardConfig({
      sections,
      pages: [{ id: "living", title: "Living room", sections: [{ title: "Lights", cards: ["light.b"] }] }],
      nav: [{ section: "Home status", label: "Status" }, { page: "living" }, { page: "home" }, { navigate: "/baby-view/0", label: "Baby" }],
    });
    expect(config.pages).toEqual([{ id: "living", title: "Living room", blocks: [expect.objectContaining({ kind: "section", title: "Lights" })] }]);
    expect(config.nav).toEqual([
      { kind: "section", title: "Home status", label: "Status" },
      { kind: "page", id: "living", label: undefined },
      { kind: "page", id: "home", label: undefined },
      { kind: "navigate", path: "/baby-view/0", label: "Baby" },
    ]);
  });

  it("takes nav: false for no nav, and leaves both out by default", () => {
    expect(parseDashboardConfig({ nav: false }).nav).toBe(false);
    expect(parseDashboardConfig({})).toMatchObject({ nav: undefined, pages: undefined });
  });

  it("names every nav and page mistake, with the probable fix", () => {
    expect(problems({
      sections,
      pages: [
        { id: "living", title: "Living room", sections: [{ title: "Lights", cards: ["light.b"] }] },
        { id: "living", title: "Again", sections: [{ cards: ["light.c"] }] },
        { id: "home", title: "Home", sections: [{ cards: ["light.c"] }] },
        { id: "Bad Id", sections: [] },
      ],
      nav: [{ section: "home status" }, { page: "livng" }, { navigate: "baby-view" }, { section: "a", page: "b" }, { lable: "x", page: "living" }, "light.a"],
    })).toEqual([
      'pages[2]: "id" can\'t be "home": that is the top-level sections',
      'pages[3]: "id" is required: lower-case letters, digits, - and _, like living-room',
      'pages[3]: "title" is required',
      'pages[3]: "sections" must be a list of at least one section',
      'pages: two pages have the id "living"',
      'nav[2]: "navigate" is a Home Assistant path like /baby-view/0',
      'nav[3]: needs exactly one of "section", "page", "navigate"',
      'nav[4]: unknown key "lable" — did you mean "label"?',
      'nav[5]: a nav item is a map with one of "section", "page" or "navigate"',
      'nav[0]: no section titled "home status" in the top-level sections — did you mean "Home status"?',
      'nav[1]: no page "livng" — did you mean "living"?',
    ]);
  });

  it("asks for distinct titles when a nav names a section that several share", () => {
    expect(problems({ sections: [{ title: "Nursery", cards: ["light.a"] }, { title: "Nursery", cards: ["light.b"] }], nav: [{ section: "Nursery" }, { section: "Nursery" }] })).toEqual([
      'nav[0]: 2 sections are titled "Nursery"; give each its own title so the nav can tell them apart',
      'nav[1]: 2 sections are titled "Nursery"; give each its own title so the nav can tell them apart',
    ]);
  });

  it("can't check a section name against the automatic layout, so leaves it to the nav", () => {
    expect(problems({ nav: [{ section: "Comfort" }] })).toEqual([]);
  });
});
