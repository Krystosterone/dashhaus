import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoLockHaTransport } from "@dashhaus/core/demo";
import { HaGlasshouseLockCard } from "./HaGlasshouseLockCard";

const meta = { title: "Studies/Glasshouse/Connected/Lock", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Connected() {
  const store = useMemo(() => createHaStore(createDemoLockHaTransport()), []);
  return <HaProvider store={store}><div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}><HaGlasshouseLockCard entityId="lock.front_door" /><HaGlasshouseLockCard entityId="lock.front_door" footprint="compact" /></div></HaProvider>;
}

export const InjectedTransport: Story = { render: () => <Connected /> };
