import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaLightModule } from "./HaLightModule";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoHaTransport } from "../../../ha/demo";

const meta = {
  title: "Field/Home Assistant/Light module",
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
