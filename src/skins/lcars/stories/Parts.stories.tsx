import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { LcarsAction, LcarsCardFrame } from "../shared/ui";

function Parts() {
  const [on, setOn] = useState(true);
  return <div style={{ width: 420, maxWidth: "100%", display: "grid", gap: 16 }}><LcarsCardFrame name="Ceiling" area="Living room" state={on ? "on" : "off"} summary={on ? "80%" : "Off"} actions={<LcarsAction label={on ? "Turn off" : "Turn on"} pressed={on} onPress={() => setOn(!on)} />} /><LcarsCardFrame name="Shelf strip" area="Living room" state="unavailable" summary="—" actions={<LcarsAction label="Toggle" unavailable onPress={() => undefined} />} /><LcarsCardFrame name="Compact Card" area="Office" state="ok" summary="21.4°" footprint="compact" /></div>;
}

const meta = { title: "Studies/Lcars/Foundations/Parts", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const States: Story = { render: () => <Parts /> };
