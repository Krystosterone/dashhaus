import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Ha__Name__Tile } from "./Ha__Name__Tile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemo__Name__HaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/__Name__",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper, actions and history path over an injected demo transport. */
function DemoConnected__Name__() {
  const store = useMemo(() => createHaStore(createDemo__Name__HaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <Ha__Name__Tile entityId="__domain__.bedroom" />
        <Ha__Name__Tile entityId="__domain__.office" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnected__Name__ /> };
