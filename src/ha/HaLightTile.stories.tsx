import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaLightTile } from "./HaLightTile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import { createDemoHaTransport } from "./demo";

const meta = {
  title: "Home Assistant/Light tile",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedLight() {
  const store = useMemo(() => createHaStore(createDemoHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw" }}>
        <HaLightTile entityId="light.living_room" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedLight /> };
