import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Ha__Name__Module } from "./Ha__Name__Module";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { __transport__ } from "__transportPath__";

const meta = {
  title: "Field/Connected/__Name__",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnected__Name__() {
  const store = useMemo(() => createHaStore(__transport__()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <Ha__Name__Module entityId="__entityId__" />
        <Ha__Name__Module entityId="__entityId__" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's __label__ tile uses, over the demo transport: both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnected__Name__ /> };
