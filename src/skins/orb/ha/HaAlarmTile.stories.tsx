import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaAlarmTile } from "./HaAlarmTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoAlarmHaTransport } from "../../../ha/demo/alarm";

const meta = {
  title: "Orb/Home Assistant/Alarm",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedAlarm({ fail = false }: { fail?: boolean }) {
  const store = useMemo(() => {
    const base = createDemoAlarmHaTransport();
    const transport = fail
      ? { ...base, callService: async () => { throw { code: "home_assistant_error", message: "Connection lost" }; } }
      : base;
    return createHaStore(transport);
  }, [fail]);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw" }}>
        <HaAlarmTile entityId="alarm_control_panel.house" area="Whole home" exitDelay={30} entryDelay={30} />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedAlarm /> };
export const CallFailure: Story = { name: "Injected transport, call fails", render: () => <DemoConnectedAlarm fail /> };
