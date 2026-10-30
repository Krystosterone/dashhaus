import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaSoundModule } from "./HaSoundModule";
import { HaProvider } from "@scope/core";
import { createHaStore } from "@scope/core";
import { createDemoSoundHaTransport } from "@scope/core/demo";

const meta = {
  title: "Field/Connected/Sound",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedSound() {
  const store = useMemo(() => createHaStore(createDemoSoundHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaSoundModule entityId="switch.nursery_music" />
        <HaSoundModule entityId="switch.nursery_music" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's sound tile uses, over the demo transport: both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedSound /> };
