import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaToggleTile } from "./HaToggleTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoToggleHaTransport } from "@dashhaus/core/demo";

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
        <HaToggleTile entityId="input_boolean.guest_mode" icon="guest" description="Lets visitors on the Wi-Fi." />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedToggle /> };
