import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoToggleHaTransport } from "@dashhaus/core/demo";
import { HaGlasshouseToggleCard } from "./HaGlasshouseToggleCard";

const meta = { title: "Studies/Glasshouse/Connected/Toggle", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Connected() {
  const store = useMemo(() => createHaStore(createDemoToggleHaTransport()), []);
  return <HaProvider store={store}><div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}><HaGlasshouseToggleCard entityId="input_boolean.guest_mode" /><HaGlasshouseToggleCard entityId="input_boolean.guest_mode" footprint="compact" /></div></HaProvider>;
}

export const InjectedTransport: Story = { render: () => <Connected /> };
