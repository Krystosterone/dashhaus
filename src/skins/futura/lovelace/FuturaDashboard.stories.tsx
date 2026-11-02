import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoHouseTransport } from "@dashhaus/core/demo";
import { areaSections } from "./auto";
import { FuturaDashboard } from "./FuturaDashboard";
import type { CardConfig } from "./config";
import type { FuturaFootprint } from "../shared/ui";

const DEMO_CARDS: CardConfig[] = [
  { entity: "light.living_room", kind: "light" },
  { entity: "climate.living_room", kind: "climate" },
  { entity: "input_boolean.guest_mode", kind: "toggle" },
  { entity: "sensor.living_room_temperature", kind: "sensor" },
  { entity: "weather.home", kind: "weather" },
  // new-card: dashboard cards
];

function Demo({ footprint = "standard" }: { footprint?: FuturaFootprint }) {
  const store = useMemo(() => createHaStore(createDemoHouseTransport()), []);
  return <HaProvider store={store}><FuturaDashboard title="Home" showTime blocks={areaSections(DEMO_CARDS)} footprint={footprint} now={new Date(2026, 9, 17, 11, 54)} /></HaProvider>;
}

const meta = { title: "Futura/Dashboards/Lovelace card", component: Demo, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Automatic: Story = {};
export const Compact: Story = { args: { footprint: "compact" } };
export const Phone: Story = { parameters: { viewport: { defaultViewport: "mobile2" } } };
