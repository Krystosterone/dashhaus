import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { __Skin__Action, __Skin__CardFrame } from "../shared/ui";

function Parts() {
  const [on, setOn] = useState(true);
  return <div style={{ width: 420, maxWidth: "100%", display: "grid", gap: 16 }}><__Skin__CardFrame name="Ceiling" area="Living room" state={on ? "on" : "off"} summary={on ? "80%" : "Off"} actions={<__Skin__Action label={on ? "Turn off" : "Turn on"} pressed={on} onPress={() => setOn(!on)} />} /><__Skin__CardFrame name="Shelf strip" area="Living room" state="unavailable" summary="—" actions={<__Skin__Action label="Toggle" unavailable onPress={() => undefined} />} /><__Skin__CardFrame name="Compact Card" area="Office" state="ok" summary="21.4°" footprint="compact" /></div>;
}

const meta = { title: "__Section__/Foundations/Parts", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const States: Story = { render: () => <Parts /> };
