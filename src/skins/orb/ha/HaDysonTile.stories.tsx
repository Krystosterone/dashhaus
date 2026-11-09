import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaDysonTile } from "./HaDysonTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoDysonHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/Dyson",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper, actions and history path over an injected demo transport: a Pure Cool and a Hot+Cool. */
function DemoConnectedDyson() {
  const store = useMemo(() => createHaStore(createDemoDysonHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaDysonTile entityId="fan.bedroom_purifier" area="Bedroom" />
        <HaDysonTile entityId="fan.living_room_hot_cool" area="Living room" />
        <HaDysonTile entityId="fan.bedroom_purifier" area="Bedroom" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedDyson /> };
