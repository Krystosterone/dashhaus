import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@scope/core";
import { createHaStore } from "@scope/core";
import { createDemoHouseTransport } from "@scope/core/demo";
import { areaSections } from "./auto";
import { __Skin__Dashboard } from "./__Skin__Dashboard";
import type { CardConfig } from "./config";
import type { __Skin__Footprint } from "../shared/ui";

const DEMO_CARDS: CardConfig[] = [
  // new-card: dashboard cards
];

function Demo({ footprint = "standard" }: { footprint?: __Skin__Footprint }) {
  const store = useMemo(() => createHaStore(createDemoHouseTransport()), []);
  return <HaProvider store={store}><__Skin__Dashboard title="Home" showTime blocks={areaSections(DEMO_CARDS)} footprint={footprint} now={new Date(2026, 9, 17, 11, 54)} /></HaProvider>;
}

const meta = { title: "__Section__/Dashboards/Lovelace card", component: Demo, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Automatic: Story = {};
export const Compact: Story = { args: { footprint: "compact" } };
export const Phone: Story = { parameters: { viewport: { defaultViewport: "mobile2" } } };
