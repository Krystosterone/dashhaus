import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaVacuumModule } from "./HaVacuumModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoVacuumHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Vacuum",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedVacuum() {
  const store = useMemo(() => createHaStore(createDemoVacuumHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaVacuumModule entityId="vacuum.robot_vacuum" />
        <HaVacuumModule entityId="vacuum.upstairs_vacuum" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's vacuum tile uses, over the demo transport: start it, pause it, send it home. */
export const InjectedTransport: Story = { render: () => <DemoConnectedVacuum /> };
