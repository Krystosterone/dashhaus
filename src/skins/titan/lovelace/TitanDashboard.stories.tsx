import { useEffect, useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoHouseTransport } from "@dashhaus/core/demo";
import { areaRows } from "./auto";
import { TitanDashboard } from "./TitanDashboard";
import type { CardConfig } from "./config";
import type { TitanFootprint } from "../shared/ui";

const DEMO_CARDS: CardConfig[] = [
  { entity: "climate.living_room", kind: "climate" },
  { entity: "light.living_room", kind: "light" },
  { entity: "lock.front_door", kind: "lock" },
  { entity: "sensor.living_room_temperature", kind: "sensor" },
  { entity: "input_boolean.guest_mode", kind: "toggle" },
  { entity: "weather.home", kind: "weather" },
  // new-card: dashboard cards
];

function Demo({ footprint = "standard", rejected = false }: { footprint?: TitanFootprint; rejected?: boolean }) {
  const store = useMemo(() => {
    const transport = createDemoHouseTransport();
    return createHaStore(rejected ? { ...transport, callService: async () => { throw new Error("Home Assistant rejected the command"); } } : transport);
  }, [rejected]);
  // A rejected command is the store's, whichever Card sent it: send one, so the page shows its recovery row.
  useEffect(() => {
    if (!rejected) return;
    let sent = false;
    const send = () => {
      if (sent || store.getSnapshot().status !== "connected") return;
      sent = true;
      void store.callService("light", "toggle", { entity_id: "light.living_room" }).catch(() => undefined);
    };
    const unsubscribe = store.subscribe(send);
    send();
    return unsubscribe;
  }, [store, rejected]);
  return <HaProvider store={store}><TitanDashboard title="Home" showTime rows={areaRows(DEMO_CARDS)} footprint={footprint} now={new Date(2026, 9, 17, 11, 54)} /></HaProvider>;
}

const meta = { title: "Studies/Titan/Dashboards/Lovelace card", component: Demo, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Automatic: Story = {};
export const Compact: Story = { args: { footprint: "compact" } };
export const Phone: Story = { parameters: { viewport: { defaultViewport: "mobile2" } } };
export const RejectedCommand: Story = { name: "Rejected command", args: { rejected: true } };
