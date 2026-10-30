import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { __transport__ } from "__transportPath__";
import { Ha__Skin____Name__Card } from "./Ha__Skin____Name__Card";

const meta = { title: "__Section__/Connected/__Name__", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Connected() {
  const store = useMemo(() => createHaStore(__transport__()), []);
  return <HaProvider store={store}><div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}><Ha__Skin____Name__Card entityId="__entityId__" /><Ha__Skin____Name__Card entityId="__entityId__" footprint="compact" /></div></HaProvider>;
}

export const InjectedTransport: Story = { render: () => <Connected /> };
