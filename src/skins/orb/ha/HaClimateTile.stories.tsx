import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaClimateTile } from "./HaClimateTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoClimateHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/Climate",
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
