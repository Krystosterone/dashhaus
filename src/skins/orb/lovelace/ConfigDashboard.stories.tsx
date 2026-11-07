import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider, useHaSelector, useHaStatus, useHaStore } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { autoDashboard } from "./auto";
import { parseDashboardConfig } from "./config";
import { ConfigDashboard } from "./ConfigDashboard";
import { createDemoHouseTransport } from "@dashhaus/core/demo";
import type { HaTransport } from "@dashhaus/core";

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

/** The automatic layout, as the card draws it when `cards` and `rows` are left out. */
function Automatic() {
  const entities = useHaSelector((snapshot) => snapshot.entities);
  const config = useMemo(() => parseDashboardConfig(autoDashboard({ states: entities })), [entities]);
  return <ConfigDashboard config={{ ...config, rows: config.rows ?? [] }} now={NOW} />;
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
export const ActionFailure: Story = { name: "Action failure and retry", render: () => <ActionFailureExample /> };
export const CompositionPhone: Story = { name: "Composition, phone", render: () => <House width={390}><Configured yaml={COMPOSED_YAML} /></House> };
export const CompositionTablet: Story = { name: "Composition, tablet", render: () => <House width={820}><Configured yaml={COMPOSED_YAML} /></House> };
export const CompositionWall: Story = { name: "Composition, wall panel", render: () => <House width={1280}><Configured yaml={COMPOSED_YAML} /></House> };
export const NavAndPages: Story = { name: "Nav and pages", render: () => <House><WithNav /></House> };
