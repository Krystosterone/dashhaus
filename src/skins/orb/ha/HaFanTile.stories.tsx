import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaFanTile } from "./HaFanTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoFanHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/Fan",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper, actions and history path over an injected demo transport. */
function DemoConnectedFan() {
  const store = useMemo(() => createHaStore(createDemoFanHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaFanTile entityId="fan.living_room_ceiling" />
        <HaFanTile entityId="fan.bedroom" footprint="compact" />
        <HaFanTile entityId="fan.bathroom_extractor" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedFan /> };
