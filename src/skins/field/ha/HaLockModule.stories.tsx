import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaLockModule } from "./HaLockModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoLockHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Lock",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedLock() {
  const store = useMemo(() => createHaStore(createDemoLockHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaLockModule entityId="lock.front_door" batteryEntityId="sensor.front_door_battery" area="Hall" />
        <HaLockModule entityId="lock.back_door" area="Kitchen" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's lock tile uses, over the demo transport: the front door asks for its code (1234), the back door locks on a press. */
export const InjectedTransport: Story = { render: () => <DemoConnectedLock /> };
