import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider, useHaSelector } from "../provider";
import { createHaStore } from "../store";
import { autoDashboard } from "./auto";
import { parseDashboardConfig } from "./config";
import { ConfigDashboard } from "./ConfigDashboard";
import { createDemoHouseTransport } from "./demo";

const meta = {
  title: "Home Assistant/Config dashboard",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The `custom:home-dashboard` Lovelace card: a whole page from its YAML (docs/deploy.md), on the demo transports. The header time is fixed at 11:54." } },
  },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

const NOW = new Date(2026, 9, 17, 11, 54);

/** The YAML in docs/deploy.md's example, as Lovelace hands it to the card. */
const YAML = {
  type: "custom:home-dashboard",
  title: "Home",
  sections: [
    { title: "Security", cards: [{ entity: "alarm_control_panel.house", footprint: "compact" }] },
    { title: "Outside", cards: [{ entity: "weather.home", aqi: "sensor.home_aqi", aqi_scale: "US" }] },
    {
      title: "Living room",
      columns: 2,
      cards: [
        { entity: "sensor.living_room_temperature", humidity: "sensor.living_room_humidity", battery: "sensor.living_room_battery" },
        "climate.living_room",
        { entity: "light.living_room", span: 2 },
        { entity: "cover.living_room", footprint: "compact", span: 2 },
      ],
    },
    {
      title: "Modes",
      columns: 2,
      cards: [
        { joined: ["input_boolean.guest_mode", "input_boolean.dnd"], label: "Modes", span: 2 },
        { entity: "switch.porch", footprint: "compact" },
        { entity: "switch.office", footprint: "compact" },
      ],
    },
  ],
};

function House({ children }: { children: ReactNode }) {
  const store = useMemo(() => createHaStore(createDemoHouseTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ maxWidth: 430, marginInline: "auto" }}>{children}</div>
    </HaProvider>
  );
}

function Configured() {
  const config = parseDashboardConfig(YAML);
  return <ConfigDashboard config={{ ...config, blocks: config.blocks ?? [] }} now={NOW} />;
}

/** The automatic layout, as the card draws it when `sections` is left out. */
function Automatic() {
  const entities = useHaSelector((snapshot) => snapshot.entities);
  const config = useMemo(() => parseDashboardConfig(autoDashboard({ states: entities })), [entities]);
  return <ConfigDashboard config={{ ...config, blocks: config.blocks ?? [] }} now={NOW} />;
}

export const FromYaml: Story = { name: "From YAML", render: () => <House><Configured /></House> };
export const AutomaticLayout: Story = { name: "Automatic layout", render: () => <House><Automatic /></House> };
