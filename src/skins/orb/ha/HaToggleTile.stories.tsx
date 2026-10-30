import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaToggleTile } from "./HaToggleTile";
import { HaProvider } from "@scope/core";
import { createHaStore } from "@scope/core";
import { createDemoToggleHaTransport } from "@scope/core/demo";

const meta = {
  title: "Orb/Connected/Toggle",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedToggle() {
  const store = useMemo(() => createHaStore(createDemoToggleHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw" }}>
        <HaToggleTile entityId="input_boolean.guest_mode" icon="guest" color="lavender" description="Lets visitors on the Wi-Fi." />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedToggle /> };
