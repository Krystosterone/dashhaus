import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaSunTile } from "./HaSunTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoSunHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/Sun",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store and mapper over an injected demo transport: the sun where it is now, its path from the demo home's location. */
function DemoConnectedSun() {
  const store = useMemo(() => createHaStore(createDemoSunHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaSunTile entityId="sun.sun" footprint="featured" />
        <HaSunTile entityId="sun.sun" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedSun /> };
