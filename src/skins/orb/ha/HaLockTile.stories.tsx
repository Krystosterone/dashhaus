import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaLockTile } from "./HaLockTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoLockHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/Lock",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The real store, mapper and actions over the demo lock transport. The back door locks on a tap; the front door " +
          "asks for its code (1234) before it unlocks or opens, and its battery is the low companion on its device.",
      },
    },
  },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper and actions over an injected demo transport. */
function DemoConnectedLock() {
  const store = useMemo(() => createHaStore(createDemoLockHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaLockTile entityId="lock.front_door" batteryEntityId="sensor.front_door_battery" area="Hall" />
        <HaLockTile entityId="lock.back_door" area="Kitchen" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedLock /> };
