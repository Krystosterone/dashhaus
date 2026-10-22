import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaClimateTile } from "./HaClimateTile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import { createDemoClimateHaTransport } from "./demo";

const meta = {
  title: "Home Assistant/Climate tile",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedClimate() {
  const store = useMemo(() => createHaStore(createDemoClimateHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw" }}>
        <HaClimateTile entityId="climate.living_room" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedClimate /> };
