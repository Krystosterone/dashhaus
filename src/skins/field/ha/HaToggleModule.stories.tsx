import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaToggleModule } from "./HaToggleModule";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoToggleHaTransport } from "../../../ha/demo/toggle";

const meta = {
  title: "Field/Connected/Toggle",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedToggle() {
  const store = useMemo(() => createHaStore(createDemoToggleHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaToggleModule entityId="input_boolean.guest_mode" domain="input_boolean" icon="guest" description="Lets visitors on the Wi-Fi." />
        <HaToggleModule entityId="input_boolean.guest_mode" domain="input_boolean" icon="guest" footprint="compact" />
        <HaToggleModule entityId="switch.office" domain="switch" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's toggle tile uses, over the demo transport: press a key, and both guest modules follow. */
export const InjectedTransport: Story = { render: () => <DemoConnectedToggle /> };
