import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider, useHaSelector, useHaStatus, useHaStore } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { autoDashboard } from "./auto";
import { parseDashboardConfig } from "./config";
import { ConfigDashboard } from "./ConfigDashboard";
import { DEMO_ENERGY_PREFS, DEMO_WALL_HOUSE, DEMO_WALL_HOUSE_WORST_CASE, createDemoHouseTransport, createDemoWallHouseTransport, demoWallInput } from "@dashhaus/core/demo";
import type { DemoWallHouse } from "@dashhaus/core/demo";
import type { HaTransport, HassEntities } from "@dashhaus/core";

const meta = {
  title: "Orb/Dashboards/Lovelace card",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The `custom:dashhaus-orb` Lovelace card: a whole page from its YAML (spec/deploy.md), on the demo transports. The header time is fixed at 11:54." } },
  },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

const NOW = new Date(2026, 9, 17, 11, 54);

/** The YAML in spec/deploy.md's example, as Lovelace hands it to the card. */
const YAML = {
  type: "custom:dashhaus-orb",
  title: "Home",
  rows: [
    { title: "Security", cards: [{ entity: "alarm_control_panel.house", footprint: "compact" }, { entity: "binary_sensor.patio_door", footprint: "compact", battery: "sensor.patio_door_battery" }] },
    { title: "Outside", cards: [{ entity: "weather.home", aqi: "sensor.home_aqi", aqi_scale: "US" }] },
    {
      title: "Living room",
      columns: 2,
      cards: [
        { entity: "sensor.living_room_temperature", humidity: "sensor.living_room_humidity", battery: "sensor.living_room_battery" },
        "climate.living_room",
        { entity: "light.living_room", width: "full" },
        { entity: "cover.living_room", footprint: "compact", width: "full" },
        // On its own: no card: and no sensor key, so its device class picks the numeric card.
        { entity: "sensor.living_room_co2", footprint: "compact", width: "full" },
      ],
    },
    {
      title: "Modes",
      columns: 2,
      cards: [
        { bundle: "joined", label: "Modes", width: "full", cards: ["input_boolean.guest_mode", "input_boolean.dnd"] },
        { entity: "switch.porch", footprint: "compact" },
        { entity: "switch.office", footprint: "compact" },
      ],
    },
    { title: "Nursery", cards: [{ entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova" }] },
  ],
};

/**
 * spec/deploy.md's power example, and the docs' Orb sample (docs/examples/user/orb.yaml, whose pictures are these
 * stories): a featured hero with a bottom-aligned sidebar, then a dense row whose compact switch fills the hole under the
 * cover, then a joined bundle across the row. The same YAML at every width.
 */
const COMPOSED_YAML = {
  type: "custom:dashhaus-orb",
  title: "Home",
  rows: [
    {
      title: "At a glance",
      columns: 3,
      align: "bottom",
      cards: [
        { entity: "climate.living_room", column: 1, width: 2, footprint: "featured" },
        { entity: "alarm_control_panel.house", column: 3 },
        { entity: "light.living_room", column: 3, footprint: "compact" },
      ],
    },
    {
      title: "Around the house",
      columns: 3,
      flow: "dense",
      cards: [
        { entity: "weather.home", width: 2 },
        { entity: "cover.living_room", column: 3, footprint: "compact" },
        { entity: "sensor.living_room_temperature", width: 2 },
        { entity: "switch.porch", footprint: "compact" },
        { bundle: "joined", label: "Modes", width: "full", cards: ["input_boolean.guest_mode", "input_boolean.dnd", "switch.office"] },
      ],
    },
  ],
};

function House({ children, transport, width = 430 }: { children: ReactNode; transport?: HaTransport; width?: number }) {
  const store = useMemo(() => createHaStore(transport ?? createDemoHouseTransport()), [transport]);
  return (
    <HaProvider store={store}>
      <div style={{ maxWidth: width, marginInline: "auto" }}>{children}</div>
    </HaProvider>
  );
}

function Configured({ yaml = YAML }: { yaml?: Record<string, unknown> }) {
  const config = parseDashboardConfig(yaml);
  return <ConfigDashboard config={{ ...config, rows: config.rows ?? [] }} now={NOW} />;
}

/**
 * The automatic layout, as the card draws it when `cards` and `rows` are left out, with the demo house's energy
 * preferences: its grid's power and meter under Energy, last.
 */
function Automatic() {
  const entities = useHaSelector((snapshot) => snapshot.entities);
  const config = useMemo(() => parseDashboardConfig(autoDashboard({ states: entities, energy: DEMO_ENERGY_PREFS })), [entities]);
  return <ConfigDashboard config={{ ...config, rows: config.rows ?? [] }} now={NOW} />;
}

/** A panel's frame, at its real size: what is past its height is past the fold, and scrolls inside. */
function Panel({ label, width, height, children }: { label: string; width: number; height: number; children: ReactNode }) {
  return (
    <figure style={{ margin: "24px auto", width, maxWidth: "100%", display: "grid", gap: 8 }}>
      <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)", paddingInline: 8 }}>{label} · {width} × {height}</figcaption>
      <div style={{ height, overflowY: "auto", borderRadius: 36, boxShadow: "inset 0 0 0 1px var(--line), var(--shadow)" }}>{children}</div>
    </figure>
  );
}

/**
 * The automatic layout with `layout: wall` and `viewing: far`, as a wall panel's card draws it, on the demo house in
 * several rooms (`DEMO_WALL_HOUSE`): one column per place under its heading, the house's own cards ending the first row.
 */
function Wall({ house }: { house: DemoWallHouse }) {
  const entities = useHaSelector((snapshot) => snapshot.entities);
  const config = useMemo(() => parseDashboardConfig({
    ...autoDashboard(demoWallInput(entities, house), "Home", { layout: "wall" }),
    viewing: "far",
    show_time: true,
  }), [entities, house]);
  return <ConfigDashboard config={{ ...config, rows: config.rows ?? [] }} now={NOW} />;
}

function WallHouse({ house = DEMO_WALL_HOUSE, label, width = 1280, height = 800 }: { house?: DemoWallHouse; label: string; width?: number; height?: number }) {
  const store = useMemo(() => createHaStore(createDemoWallHouseTransport(house)), [house]);
  return (
    <HaProvider store={store}>
      <Panel label={label} width={width} height={height}><Wall house={house} /></Panel>
    </HaProvider>
  );
}

function FailedAction() {
  const store = useHaStore();
  const status = useHaStatus();
  const attempted = useRef(false);
  useEffect(() => {
    if (status !== "connected" || attempted.current) return;
    attempted.current = true;
    void store.callService("light", "toggle", { entity_id: "light.living_room" }).catch(() => undefined);
  }, [status, store]);
  const config = parseDashboardConfig({
    type: "custom:dashhaus-orb",
    title: "Home",
    cards: [{ entity: "light.living_room" }],
  });
  return <ConfigDashboard config={{ ...config, rows: config.rows ?? [] }} now={NOW} />;
}

function ActionFailureExample() {
  const transport = useMemo<HaTransport>(() => {
    const demo = createDemoHouseTransport();
    return { ...demo, callService: async () => { throw new Error("Demo action rejected"); } };
  }, []);
  return <House transport={transport}><FailedAction /></House>;
}

/** The demo house with its back door jammed, keeping every other entity as it is. */
function jammedHouse(): HaTransport {
  const demo = createDemoHouseTransport();
  let source: HassEntities[string] | undefined;
  let jammed: HassEntities[string] | undefined;
  return {
    ...demo,
    subscribeEntities: (listener) => demo.subscribeEntities((entities) => {
      const door = entities["lock.back_door"];
      if (door !== source) {
        source = door;
        jammed = door && { ...door, state: "jammed" };
      }
      listener(jammed ? { ...entities, "lock.back_door": jammed } : entities);
    }),
  };
}

/** A row on a phone is one track, so it keeps Orb's attention budget (Orb → Foundations → Attention). */
const ONE_TRACK_YAML = {
  type: "custom:dashhaus-orb",
  title: "Attention",
  rows: [{ title: "One track", cards: ["light.living_room", "lock.back_door", "cover.living_room"] }],
};

function OneTrack() {
  const transport = useMemo(jammedHouse, []);
  return <House transport={transport} width={390}><Configured yaml={ONE_TRACK_YAML} /></House>;
}

/** spec/deploy.md's navigation example: the main page, two pages of the card's own, and another dashboard. */
const NAV_YAML = {
  type: "custom:dashhaus-orb",
  title: "Home",
  rows: [
    { title: "Quick actions", cards: [{ entity: "light.living_room", footprint: "compact" }, { entity: "switch.office", footprint: "compact" }] },
    { title: "Home status", cards: [{ entity: "alarm_control_panel.house", footprint: "compact" }, { entity: "climate.living_room", footprint: "compact" }] },
  ],
  pages: [
    { id: "living", title: "Living room", rows: [{ title: "Comfort", cards: ["climate.living_room"] }, { title: "Lights and blinds", cards: ["light.living_room", { entity: "cover.living_room", footprint: "compact" }] }] },
    { id: "nursery", title: "Nursery", cards: [{ entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova" }] },
  ],
  nav: [{ page: "home" }, { page: "living" }, { page: "nursery" }, { navigate: "/baby-view/0", label: "Baby view" }],
};

/** In Home Assistant the Baby view pill would leave for that dashboard; here it stays put. */
function WithNav() {
  const config = parseDashboardConfig(NAV_YAML);
  return <ConfigDashboard config={{ ...config, rows: config.rows ?? [] }} now={NOW} navigate={() => undefined} />;
}

export const FromYaml: Story = { name: "From YAML", render: () => <House><Configured /></House> };
export const AutomaticLayout: Story = { name: "Automatic layout", render: () => <House><Automatic /></House> };
/**
 * `layout: wall` and `viewing: far` on a 1280 × 800 panel: a column per place, by area name, three across, each under
 * its place's heading, so its cards leave their own area out; the house's own alarm, modes, guest Wi-Fi and calendars
 * end the first row, and the next places wrap under it. What is pressed is a compact row, what is read standard.
 */
export const AutomaticWall: Story = { name: "Automatic layout, wall panel", render: () => <WallHouse label="Wall panel" /> };
/**
 * The worst case for a wall: eight rooms, so three rows of places; the longest area name, ending in an ellipsis; a room
 * of one card (the hallway's smoke alarm); and, in a late room, a jammed lock and an open door, below the fold. Orb has
 * no alert line, so nothing on the first screen says so (spec/deploy.md → The wall layout).
 */
export const AutomaticWallWorstCase: Story = { name: "Automatic layout, wall panel, worst case", render: () => <WallHouse house={DEMO_WALL_HOUSE_WORST_CASE} label="Wall panel, worst case" /> };
/**
 * The same wall on an 800 × 1280 portrait panel: three columns still fit (each over 156 px), so each place keeps its
 * column and heading, its compact rows trading their inline control for their value line under 320 px.
 */
export const AutomaticWallPortrait: Story = { name: "Automatic layout, wall panel, portrait", render: () => <WallHouse label="Wall panel, portrait" width={800} height={1280} /> };
export const ActionFailure: Story = { name: "Action failure and retry", render: () => <ActionFailureExample /> };
export const CompositionPhone: Story = { name: "Composition, phone", render: () => <House width={390}><Configured yaml={COMPOSED_YAML} /></House> };
export const CompositionTablet: Story = { name: "Composition, tablet", render: () => <House width={820}><Configured yaml={COMPOSED_YAML} /></House> };
export const CompositionWall: Story = { name: "Composition, wall panel", render: () => <House width={1280}><Configured yaml={COMPOSED_YAML} /></House> };
export const NavAndPages: Story = { name: "Nav and pages", render: () => <House><WithNav /></House> };
/** A Lovelace row on a phone is one track, and keeps the same budget: the lamp full, the open curtains after the jam at half. */
export const OneTrackRow: Story = { name: "One-track row", render: () => <OneTrack /> };
