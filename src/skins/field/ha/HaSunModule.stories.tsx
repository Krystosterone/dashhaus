import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaSunModule } from "./HaSunModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoSunHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Sun",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedSun() {
  const store = useMemo(() => createHaStore(createDemoSunHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaSunModule entityId="sun.sun" />
        <HaSunModule entityId="sun.sun" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's sun tile uses, over the demo transport: both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedSun /> };
