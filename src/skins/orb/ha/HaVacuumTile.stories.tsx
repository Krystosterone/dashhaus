import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaVacuumTile } from "./HaVacuumTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoVacuumHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/Vacuum",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper, actions and history path over an injected demo transport: start it, pause it, send it home. */
function DemoConnectedVacuum() {
  const store = useMemo(() => createHaStore(createDemoVacuumHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaVacuumTile entityId="vacuum.robot_vacuum" footprint="featured" />
        <HaVacuumTile entityId="vacuum.upstairs_vacuum" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedVacuum /> };
