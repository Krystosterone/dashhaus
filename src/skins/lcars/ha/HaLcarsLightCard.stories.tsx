import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoHaTransport } from "@dashhaus/core/demo";
import { HaLcarsLightCard } from "./HaLcarsLightCard";

const meta = { title: "Studies/Lcars/Connected/Light", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Connected() {
  const store = useMemo(() => createHaStore(createDemoHaTransport()), []);
  return <HaProvider store={store}><div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}><HaLcarsLightCard entityId="light.living_room" /><HaLcarsLightCard entityId="light.living_room" footprint="compact" /></div></HaProvider>;
}

export const InjectedTransport: Story = { render: () => <Connected /> };
