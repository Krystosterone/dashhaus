import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider, useHaSelector, useHaStatus, useHaStore } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { autoDashboard } from "./auto";
import { parseDashboardConfig } from "./config";
import { ConfigDashboard } from "./ConfigDashboard";
import { createDemoHouseTransport } from "../../../ha/demo/house";
import type { HaTransport } from "../../../ha/types";

const meta = {
  title: "Orb/Home Assistant/Dashboard",
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
    { title: "Nursery", cards: [{ entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova" }] },
  ],
};

function House({ children, transport }: { children: ReactNode; transport?: HaTransport }) {
  const store = useMemo(() => createHaStore(transport ?? createDemoHouseTransport()), [transport]);
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
    type: "custom:home-dashboard",
    title: "Home",
    sections: [{ title: "Living room", cards: [{ entity: "light.living_room" }] }],
  });
  return <ConfigDashboard config={{ ...config, blocks: config.blocks ?? [] }} now={NOW} />;
}

function ActionFailureExample() {
  const transport = useMemo<HaTransport>(() => {
    const demo = createDemoHouseTransport();
    return { ...demo, callService: async () => { throw new Error("Demo action rejected"); } };
  }, []);
  return <House transport={transport}><FailedAction /></House>;
}

/** docs/deploy.md's navigation example: the main page, two pages of the card's own, and another dashboard. */
const NAV_YAML = {
  type: "custom:home-dashboard",
  title: "Home",
  sections: [
    { title: "Quick actions", cards: [{ entity: "light.living_room", footprint: "compact" }, { entity: "switch.office", footprint: "compact" }] },
    { title: "Home status", cards: [{ entity: "alarm_control_panel.house", footprint: "compact" }, { entity: "climate.living_room", footprint: "compact" }] },
  ],
  pages: [
    { id: "living", title: "Living room", sections: [{ title: "Comfort", cards: ["climate.living_room"] }, { title: "Lights and blinds", cards: ["light.living_room", { entity: "cover.living_room", footprint: "compact" }] }] },
    { id: "nursery", title: "Nursery", sections: [{ title: "Baby", cards: [{ entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova" }] }] },
  ],
  nav: [{ page: "home" }, { page: "living" }, { page: "nursery" }, { navigate: "/baby-view/0", label: "Baby view" }],
};

/** In Home Assistant the Baby view pill would leave for that dashboard; here it stays put. */
function WithNav() {
  const config = parseDashboardConfig(NAV_YAML);
  return <ConfigDashboard config={{ ...config, blocks: config.blocks ?? [] }} now={NOW} navigate={() => undefined} />;
}

export const FromYaml: Story = { name: "From YAML", render: () => <House><Configured /></House> };
export const AutomaticLayout: Story = { name: "Automatic layout", render: () => <House><Automatic /></House> };
export const ActionFailure: Story = { name: "Action failure and retry", render: () => <ActionFailureExample /> };
export const NavAndPages: Story = { name: "Nav and pages", render: () => <House><WithNav /></House> };
