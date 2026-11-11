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

/** The items of the main page's first row. */
const items = (raw: Record<string, unknown>) => parseDashboardConfig(raw).rows?.[0].cards.map((entry) => entry.item);

describe("parseDashboardConfig", () => {
  it("leaves the layout to the automatic one when cards and rows are left out", () => {
    expect(parseDashboardConfig({ type: "custom:dashhaus-orb" })).toEqual({
      title: "Home", subtitle: undefined, showTime: false, hourCycle: undefined, theme: "home-assistant", accent: undefined, rows: undefined, stills: true, quiet: false,
    });
  });

  it("takes layout: wall for the automatic layout, and refuses it beside a layout of its own", () => {
    expect(parseDashboardConfig({ layout: "wall", viewing: "far" })).toMatchObject({ layout: "wall", viewing: "far", rows: undefined });
    expect(parseDashboardConfig({}).layout).toBeUndefined();
    expect(problems({ layout: "wall", rows: [{ title: "Lights", cards: ["light.a"] }] })).toEqual(['layout: "layout" lays the house out automatically: leave out "rows", or leave out "layout"']);
    expect(problems({ layout: "wall", cards: ["light.a"], pages: [{ id: "more", title: "More", cards: ["light.b"] }] })).toEqual([
      'layout: "layout" lays the house out automatically: leave out "cards", or leave out "layout"',
      'layout: "layout" lays the house out automatically: leave out "pages", or leave out "layout"',
    ]);
    expect(problems({ layout: "walls" })).toEqual(['"layout" must be one of "wall" — did you mean "wall"?']);
  });

  it("takes a camera's still and refresh, and the dashboard's stills and quiet", () => {
    expect(items({ cards: ["camera.door", { entity: "camera.nursery", still: false }, { entity: "camera.drive", refresh: 30 }] })).toMatchObject([
      { kind: "camera", entity: "camera.door" },
      { kind: "camera", entity: "camera.nursery", still: false },
      { kind: "camera", entity: "camera.drive", refresh: 30 },
    ]);
    expect(parseDashboardConfig({ stills: false, quiet: true })).toMatchObject({ stills: false, quiet: true });
    expect(problems({ stills: "no", cards: [{ entity: "camera.door", refresh: 0 }, { entity: "camera.door", unit: "%" }] })).toEqual([
      'cards[0] (camera.door): "refresh" must be a whole number from 1 to 3600',
      'cards[1] (camera.door): unknown key "unit"',
      '"stills" must be true or false',
    ]);
  });

  it("leaves the card of a sensor listed on its own to its attributes, and names the card a key belongs to", () => {
    expect(items({ cards: ["sensor.office_co2", { entity: "sensor.office", humidity: "sensor.office_humidity" }, { entity: "sensor.office_co2", card: "numeric" }, "sensor.crib_sleep_state"] })!.map((card) => [card.kind, "defaulted" in card])).toEqual([
      ["sensor", true],
      ["sensor", false],
      ["numeric", false],
      ["owlet", false],
    ]);
    expect(items({ cards: ["light.a"] })![0]).not.toHaveProperty("defaulted");
    expect(problems({ cards: [{ entity: "sensor.office_co2", stale_after: 5 }, { entity: "sensor.office_co2", card: "sensor", stale_after: 5 }] })).toEqual([
      'cards[0] (sensor.office_co2): "stale_after" is the owlet card\'s: add card: owlet',
      'cards[1] (sensor.office_co2): unknown key "stale_after"',
    ]);
  });

  it("names the numeric card as the one a warning limit belongs to, on a sensor listed on its own", () => {
    expect(problems({ cards: [{ entity: "sensor.office_co2", warn_above: 1200 }, { entity: "sensor.office_co2", card: "sensor", warn_below: 400 }] })).toEqual([
      'cards[0] (sensor.office_co2): "warn_above" is the numeric card\'s: add card: numeric',
      'cards[1] (sensor.office_co2): unknown key "warn_below"',
    ]);
  });

  it("draws plain cards as one row, with the page's columns", () => {
    const config = parseDashboardConfig({ columns: 2, cards: [{ entity: "climate.a", width: "full" }, "light.a", "cover.a"] });
    expect(config.rows).toMatchObject([{ title: undefined, columns: 2, flow: "normal", align: "top", cards: [
      { width: "full", item: { kind: "climate", entity: "climate.a" } },
      { width: 1, item: { kind: "light" } },
      { width: 1, item: { kind: "cover" } },
    ] }]);
  });

  it("picks each card from its entity's domain", () => {
    expect(items({ cards: ["light.a", "climate.a", "sensor.a", "weather.a", "cover.a", "input_boolean.a", "switch.a", "alarm_control_panel.a"] })
      ?.map((i) => ("entity" in i ? [i.kind, i.entity] : i.kind))).toEqual([
      ["light", "light.a"], ["climate", "climate.a"], ["sensor", "sensor.a"], ["weather", "weather.a"],
      ["cover", "cover.a"], ["toggle", "input_boolean.a"], ["toggle", "switch.a"], ["alarm", "alarm_control_panel.a"],
    ]);
  });

  it("picks a shared card from the entity id or from card:", () => {
    expect(items({ cards: [
      "sensor.owlet_sock_ac0_sleep_state",
      { entity: "sensor.nova", card: "owlet", heart_rate: "sensor.nova_bpm", oxygen: "sensor.nova_spo2", charging: "binary_sensor.nova_dock", base_station: "switch.nova_base", stale_after: 5 },
      { entity: "sensor.odd_sleep_state", card: "sensor" },
      { entity: "sensor.ben", card: "owlet", alerts: { low_oxygen: "binary_sensor.ben_spo2_low", sock_off: "binary_sensor.ben_off" } },
    ] })).toMatchObject([
      { kind: "owlet", entity: "sensor.owlet_sock_ac0_sleep_state" },
      { kind: "owlet", entity: "sensor.nova", heartRate: "sensor.nova_bpm", oxygen: "sensor.nova_spo2", charging: "binary_sensor.nova_dock", baseStation: "switch.nova_base", staleAfter: 5 },
      { kind: "sensor", entity: "sensor.odd_sleep_state" },
      { kind: "owlet", alerts: { low_oxygen: "binary_sensor.ben_spo2_low", sock_off: "binary_sensor.ben_off" } },
    ]);
  });

  it("takes a numeric reading's unit and the limits it warns past, a band low under high, on the numeric card only", () => {
    expect(items({ cards: [
      { entity: "sensor.bedroom_co2", card: "numeric", warn_above: 1200 },
      { entity: "sensor.freezer", card: "numeric", unit: "°C", warn_below: -25, warn_above: -15.5 },
    ] })).toMatchObject([
      { kind: "numeric", entity: "sensor.bedroom_co2", warnAbove: 1200, warnBelow: undefined },
      { kind: "numeric", entity: "sensor.freezer", unit: "°C", warnAbove: -15.5, warnBelow: -25 },
    ]);
    expect(problems({ cards: [
      { entity: "sensor.a", card: "numeric", warn_above: "high" },
      { entity: "sensor.b", card: "numeric", warn_below: 24, warn_above: 18 },
      { entity: "light.c", warn_above: 1 },
    ] })).toEqual([
      'cards[0] (sensor.a): "warn_above" must be a number',
      'cards[1] (sensor.b): "warn_below" must be under "warn_above"',
      'cards[2] (light.c): unknown key "warn_above"',
    ]);
  });

  it("takes a cover's device_class, the classes that ask first, ahead of Home Assistant's", () => {
    expect(items({ cards: ["cover.blind", { entity: "cover.garage_door", device_class: "garage" }] })).toMatchObject([
      { kind: "cover", entity: "cover.blind", deviceClass: undefined },
      { kind: "cover", entity: "cover.garage_door", deviceClass: "garage" },
    ]);
    expect(problems({ cards: [{ entity: "cover.blind", device_class: "curtain" }, { entity: "cover.gate", device_class: "gates" }, { entity: "light.a", device_class: "garage" }] })).toEqual([
      'cards[0] (cover.blind): "device_class" must be one of "garage", "door", "gate"',
      'cards[1] (cover.gate): "device_class" must be one of "garage", "door", "gate" — did you mean "gate"?',
      'cards[2] (light.a): unknown key "device_class"',
    ]);
  });

  it("draws a switch as a sound only with card:, with its volume number", () => {
    expect(items({ cards: [
      "switch.nursery_music",
      { entity: "switch.nursery_music", card: "sound" },
      { entity: "switch.noise", card: "sound", volume: "number.noise_level" },
    ] })).toMatchObject([
      { kind: "toggle", entity: "switch.nursery_music" },
      { kind: "sound", entity: "switch.nursery_music", volume: undefined },
      { kind: "sound", entity: "switch.noise", volume: "number.noise_level" },
    ]);
    expect(problems({ cards: [{ entity: "switch.noise", card: "sound", volume: "sensor.noise_level" }] })).toEqual([
      "cards[0] (switch.noise).volume: sensor.noise_level must be a number.* entity",
    ]);
  });

  it("draws a voucher sensor as guest Wi-Fi by its id, any other sensor with card:, and checks its companions' domains", () => {
    expect(items({ cards: [
      "sensor.67d9d6d6ad84e044caf4621c_voucher",
      "sensor.hall_temperature",
      { entity: "sensor.visitors", card: "guestWifi", qr: "image.visitors_qr", new_code: "button.visitors_new", refresh: "button.visitors_fetch" },
    ] })).toMatchObject([
      { kind: "guestWifi", entity: "sensor.67d9d6d6ad84e044caf4621c_voucher", qr: undefined, newCode: undefined, refresh: undefined },
      { kind: "sensor", entity: "sensor.hall_temperature" },
      { kind: "guestWifi", entity: "sensor.visitors", qr: "image.visitors_qr", newCode: "button.visitors_new", refresh: "button.visitors_fetch" },
    ]);
    expect(problems({ cards: [{ entity: "sensor.site_voucher", qr: "camera.site", new_code: "switch.new_code" }] })).toEqual([
      "cards[0] (sensor.site_voucher).qr: camera.site must be a image.* entity",
      "cards[0] (sensor.site_voucher).new_code: switch.new_code must be a button.* or input_button.* or script.* entity",
    ]);
  });

  it("draws a password in an input_text as guest Wi-Fi only with card:, its network named and its script pressed", () => {
    expect(items({ cards: [
      { entity: "input_text.guest_password", card: "guestWifi", network: "Maple Guests 5G", qr: "image.guest_qr", new_code: "script.new_guest_password", refresh: "input_button.fetch" },
      { entity: "sensor.site_voucher", access: "password" },
    ] })).toMatchObject([
      { kind: "guestWifi", entity: "input_text.guest_password", network: "Maple Guests 5G", qr: "image.guest_qr", newCode: "script.new_guest_password", refresh: "input_button.fetch" },
      { kind: "guestWifi", access: "password" },
    ]);
    expect(problems({ cards: ["input_text.guest_password"] })).toEqual([expect.stringContaining("guestWifi")]);
    expect(problems({ cards: [{ entity: "sensor.site_voucher", access: "wpa" }] })).toEqual([expect.stringContaining("access")]);
  });

  it("checks an owlet's alert sensors by alert name and domain", () => {
    expect(problems({ rows: [{ cards: [
      { entity: "sensor.a_sleep_state", alerts: { low_oxygn: "binary_sensor.a", sock_off: "sensor.a_off" } },
      { entity: "sensor.b_sleep_state", alerts: ["binary_sensor.b"] },
    ] }] })).toEqual([
      'rows[0].cards[0] (sensor.a_sleep_state).alerts: unknown key "low_oxygn" — did you mean "low_oxygen"?',
      "rows[0].cards[0] (sensor.a_sleep_state).alerts.sock_off: sensor.a_off must be a binary_sensor.* entity",
      'rows[0].cards[1] (sensor.b_sleep_state): "alerts" must map alerts to binary_sensor.* entities, like low_oxygen: binary_sensor.sock_low_oxygen',
    ]);
  });

  it("refuses a card's own colour, saying the accent sets the one colour", () => {
    expect(problems({ cards: [{ entity: "light.a", color: "lavender" }, { bundle: "joined", cards: ["input_boolean.a", { entity: "input_boolean.b", color: "rose" }] }] })).toEqual([
      'cards[0] (light.a): "color" is gone: a card has no colour of its own, and the dashboard\'s "accent" sets the one colour every card is on in',
      'cards[1].cards[1] (input_boolean.b): "color" is gone: a card has no colour of its own, and the dashboard\'s "accent" sets the one colour every card is on in',
    ]);
  });

  it("only offers card: the cards of the entity's domain", () => {
    expect(problems({ accent: { hue: 200 } })).toEqual(["accent.chroma: is required with the other"]);
    expect(problems({ cards: [{ entity: "light.a", card: "owlet" }, { entity: "sensor.a", card: "owlett" }] })).toEqual([
      'cards[0] (light.a): "card" must be one of "light"',
      expect.stringMatching(/^cards\[1\] \(sensor\.a\): "card" must be one of "sensor", "owlet"(, .*)? — did you mean "owlet"\?$/),
    ]);
  });

  it("maps snake_case options onto the tile's settings, and placement onto the row", () => {
    const config = parseDashboardConfig({
      title: "Flat",
      show_time: true,
      hour_cycle: "h23",
      viewing: "far",
      theme: "dark",
      accent: "sage",
      rows: [{
        title: "Air",
        note: "Now",
        columns: 2,
        flow: "dense",
        align: "bottom",
        cards: [
          { entity: "sensor.t", humidity: "sensor.h", battery: "sensor.b", footprint: "compact", width: 2, show_control: false, history: false },
          { entity: "weather.home", aqi: "sensor.aqi", aqi_scale: "US", forecasts: false, column: 2 },
          { entity: "switch.fan", icon: "waves", description: "Ceiling fan" },
          { entity: "alarm_control_panel.house", read_only: true, exit_delay: 30, open_sensors: ["Back door"] },
        ],
      }],
    });
    expect(config).toMatchObject({ title: "Flat", showTime: true, hourCycle: "h23", viewing: "far", theme: "dark", accent: { chroma: 0.08, hue: 150 } });
    expect(config.rows?.[0]).toMatchObject({
      title: "Air",
      note: "Now",
      columns: 2,
      flow: "dense",
      align: "bottom",
      cards: [
        { width: 2, item: { kind: "sensor", entity: "sensor.t", humidity: "sensor.h", battery: "sensor.b", footprint: "compact", showControl: false, history: false } },
        { width: 1, column: 2, item: { kind: "weather", aqi: "sensor.aqi", aqiScale: "US", sun: "sun.sun", forecasts: false } },
        { item: { kind: "toggle", icon: "waves", description: "Ceiling fan" } },
        { item: { kind: "alarm", readOnly: true, exitDelay: 30, openSensors: ["Back door"] } },
      ],
    });
  });

  it("reads each bundle by its kind, placed as one", () => {
    expect(parseDashboardConfig({ rows: [{ columns: 2, cards: [
      { bundle: "joined", label: "Sleep", width: 2, cards: ["input_boolean.a", "input_boolean.b"] },
      { bundle: "lead", label: "Upstairs", sheet_title: "Also upstairs", column: 1, cards: ["climate.up", "climate.dyson"] },
      { bundle: "titled", title: "Sound machine", area: "Baby Room", cards: [{ entity: "switch.nursery", name: "Power", icon: "power" }, "light.nursery", { entity: "switch.nursery_music", card: "sound" }] },
    ] }] }).rows?.[0].cards).toMatchObject([
      { width: 2, item: { kind: "joined", label: "Sleep", members: [{ entity: "input_boolean.a" }, { entity: "input_boolean.b" }] } },
      { column: 1, item: { kind: "lead", label: "Upstairs", sheetTitle: "Also upstairs", lead: { entity: "climate.up" }, rows: [{ entity: "climate.dyson" }] } },
      { item: { kind: "titled", title: "Sound machine", area: "Baby Room", rows: [{ kind: "toggle", name: "Power", icon: "power" }, { kind: "light" }, { kind: "sound" }] } },
    ]);
  });

  it("says what each bundle needs, and keeps its members' footprints and places its own", () => {
    expect(problems({ cards: [
      { cards: ["light.a", "light.b"] },
      { bundle: "stacked", cards: ["light.a", "light.b"] },
      { bundle: "joined", cards: ["light.a"] },
      { bundle: "lead", sheet_title: "More", cards: ["climate.a"] },
      { bundle: "titled", lid: "x", cards: ["light.a"] },
      { bundle: "joined", cards: [{ entity: "light.a", footprint: "standard", width: 2 }, { bundle: "joined", cards: [] }, "light.c"] },
    ] })).toEqual([
      'cards[0]: a map of "cards" in a row is a bundle: say which with "bundle": joined, lead or titled',
      'cards[1]: "bundle" must be one of "joined", "lead", "titled"',
      "cards[2].cards: a joined bundle shares one card between two or more compact cards: list at least 2 cards",
      "cards[3].cards: a lead bundle is its first card, standard, then one or more compact rows: list at least 2 cards",
      'cards[4]: unknown key "lid"',
      'cards[4]: a titled bundle needs a "title" naming what its cards make up, like Sound machine',
      'cards[5].cards[0] (light.a): "footprint" is the bundle\'s to set: every card in it is compact (a lead bundle\'s first card, standard)',
      'cards[5].cards[0] (light.a): "width" places the whole bundle: put it on the bundle, beside "bundle"',
      'cards[5].cards[1]: bundles don\'t nest: put this bundle beside the other in the row\'s "cards"',
    ]);
  });

  it("lists every problem with its path and the key or value that was probably meant", () => {
    expect(problems({
      titel: "Home",
      theme: "drak",
      rows: [
        { title: "A", cards: [{ entity: "sensor.t", humdity: "sensor.h" }, "lamp", "scene.movie_night", { entity: "light.a", footprint: "huge" }] },
        { title: "B" },
      ],
    })).toEqual([
      'unknown key "titel" — did you mean "title"?',
      'rows[0].cards[0] (sensor.t): unknown key "humdity" — did you mean "humidity"?',
      'rows[0].cards[1]: "lamp" is not an entity id like light.kitchen',
      expect.stringContaining("rows[0].cards[2]: scene.movie_night: scene.* entities have no card yet"),
      'rows[0].cards[3] (light.a): "footprint" must be one of "compact", "standard", "featured"',
      'rows[1]: "cards" must be a list of at least one card',
      '"theme" must be one of "home-assistant", "auto", "light", "dark" — did you mean "dark"?',
    ]);
  });

  it("explains the layout's beginner mistakes with a fix", () => {
    expect(problems({ sections: [{ title: "A", cards: ["light.a"] }] })).toEqual([
      'sections: isn\'t a key: list the page\'s cards under "cards" for one plain grid, or under "rows" in titled groups (each row: title, columns, cards)',
    ]);
    expect(problems({ columns: 2, cards: [{ entity: "light.a", span: 2 }, { entity: "light.b", width: 3 }], rows: [{ cards: ["light.c"] }] })).toEqual([
      '"cards" and "rows" both lay out this page: keep "cards" for one plain grid, or move those cards into a row under "rows"',
      'cards[0] (light.a): "span" isn\'t a key: a card spans columns with "width", a whole number or full',
      'cards[1] (light.b): "width: 3" is wider than this row\'s 2 columns: use width: full, or raise the row\'s columns to 3',
    ]);
    expect(problems({ rows: ["light.a", { title: "A", rows: [{ cards: ["light.b"] }], cards: ["light.c"] }] })).toEqual([
      'rows[0] (light.a): this is a card, not a row: put it in a row\'s "cards", or list the cards under "cards" at the top for one plain grid',
      'rows[1]: rows don\'t nest: list this row\'s cards under its own "cards", and put the inner rows beside it in the page\'s "rows"',
    ]);
  });

  it("rejects companions from the wrong domain", () => {
    expect(problems({ cards: [{ entity: "weather.home", sun: "sensor.sun" }] })).toEqual([
      "cards[0] (weather.home).sun: sensor.sun must be a sun.* entity",
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
  const rows = [{ title: "Quick actions", cards: ["light.a"] }, { title: "Home status", cards: ["climate.a"] }];

  it("reads pages and a nav of titled rows, pages and other dashboards", () => {
    const config = parseDashboardConfig({
      rows,
      pages: [{ id: "living", title: "Living room", rows: [{ title: "Lights", cards: ["light.b"] }] }, { id: "nursery", title: "Nursery", columns: 2, cards: ["light.c"] }],
      nav: [{ section: "Home status", label: "Status" }, { page: "living" }, { page: "home" }, { navigate: "/baby-view/0", label: "Baby" }],
    });
    expect(config.pages).toEqual([
      { id: "living", title: "Living room", rows: [expect.objectContaining({ title: "Lights" })] },
      { id: "nursery", title: "Nursery", rows: [expect.objectContaining({ title: undefined, columns: 2 })] },
    ]);
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
      rows,
      pages: [
        { id: "living", title: "Living room", rows: [{ title: "Lights", cards: ["light.b"] }] },
        { id: "living", title: "Again", cards: ["light.c"] },
        { id: "home", title: "Home", cards: ["light.c"] },
        { id: "Bad Id" },
      ],
      nav: [{ section: "home status" }, { page: "livng" }, { navigate: "baby-view" }, { section: "a", page: "b" }, { lable: "x", page: "living" }, "light.a"],
    })).toEqual([
      'pages[2]: "id" can\'t be "home": that is the main page',
      'pages[3]: "id" is required: lower-case letters, digits, - and _, like living-room',
      'pages[3]: "title" is required',
      'pages[3]: a page needs "cards", or "rows" of cards',
      'pages: two pages have the id "living"',
      'nav[2]: "navigate" is a Home Assistant path like /baby-view/0',
      'nav[3]: needs exactly one of "section", "page", "navigate"',
      'nav[4]: unknown key "lable" — did you mean "label"?',
      'nav[5]: a nav item is a map with one of "section", "page" or "navigate"',
      'nav[0]: no row titled "home status" on the main page — did you mean "Home status"?',
      'nav[1]: no page "livng" — did you mean "living"?',
    ]);
  });

  it("asks for distinct titles when a nav names a row that several share", () => {
    expect(problems({ rows: [{ title: "Nursery", cards: ["light.a"] }, { title: "Nursery", cards: ["light.b"] }], nav: [{ section: "Nursery" }, { section: "Nursery" }] })).toEqual([
      'nav[0]: 2 rows are titled "Nursery"; give each its own title so the nav can tell them apart',
      'nav[1]: 2 rows are titled "Nursery"; give each its own title so the nav can tell them apart',
    ]);
  });

  it("can't check a row's name against the automatic layout, so leaves it to the nav", () => {
    expect(problems({ nav: [{ section: "Comfort" }] })).toEqual([]);
  });
});
