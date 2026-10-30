import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaAlarmModule } from "./HaAlarmModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoAlarmHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/Alarm",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedAlarm() {
  const store = useMemo(() => createHaStore(createDemoAlarmHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaAlarmModule entityId="alarm_control_panel.house" area="Whole home" />
        <HaAlarmModule entityId="alarm_control_panel.house" area="Whole home" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's alarm tile uses, over the demo transport (code 1234): both modules follow the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedAlarm /> };
