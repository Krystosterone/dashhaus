import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaLightModule } from "./HaLightModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Light",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedLight() {
  const store = useMemo(() => createHaStore(createDemoHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaLightModule entityId="light.living_room" />
        <HaLightModule entityId="light.living_room" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's light tile uses, over the demo transport: press, slide, and both modules follow. */
export const InjectedTransport: Story = { render: () => <DemoConnectedLight /> };
