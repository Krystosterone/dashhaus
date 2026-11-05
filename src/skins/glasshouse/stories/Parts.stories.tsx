import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { GlasshouseAction, GlasshouseCardFrame } from "../shared/ui";

function Parts() {
  const [on, setOn] = useState(true);
  return <div style={{ width: 420, maxWidth: "100%", display: "grid", gap: 16 }}><GlasshouseCardFrame name="Ceiling" area="Living room" state={on ? "on" : "off"} summary={on ? "80%" : "Off"} actions={<GlasshouseAction label={on ? "Turn off" : "Turn on"} pressed={on} onPress={() => setOn(!on)} />} /><GlasshouseCardFrame name="Shelf strip" area="Living room" state="unavailable" summary="—" actions={<GlasshouseAction label="Toggle" unavailable onPress={() => undefined} />} /><GlasshouseCardFrame name="Compact Card" area="Office" state="ok" summary="21.4°" footprint="compact" /></div>;
}

const meta = { title: "Studies/Glasshouse/Foundations/Parts", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const States: Story = { render: () => <Parts /> };
