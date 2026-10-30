import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaSoundTile } from "./HaSoundTile";
import { HaProvider } from "@scope/core";
import { createHaStore } from "@scope/core";
import { createDemoSoundHaTransport } from "@scope/core/demo";

const meta = {
  title: "Orb/Connected/Sound",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper, actions and history path over an injected demo transport. */
function DemoConnectedSound() {
  const store = useMemo(() => createHaStore(createDemoSoundHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaSoundTile entityId="switch.nursery_music" name="White noise" />
        <HaSoundTile entityId="switch.bedroom" />
        <HaSoundTile entityId="switch.office" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedSound /> };
