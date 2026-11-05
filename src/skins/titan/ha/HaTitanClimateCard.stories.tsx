import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoClimateHaTransport } from "@dashhaus/core/demo";
import { HaTitanClimateCard } from "./HaTitanClimateCard";

const meta = { title: "Studies/Titan/Connected/Climate", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Connected() {
  const store = useMemo(() => createHaStore(createDemoClimateHaTransport()), []);
  return <HaProvider store={store}><div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}><HaTitanClimateCard entityId="climate.living_room" /><HaTitanClimateCard entityId="climate.living_room" footprint="compact" /></div></HaProvider>;
}

export const InjectedTransport: Story = { render: () => <Connected /> };
