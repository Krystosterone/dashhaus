import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaHumidifierTile } from "./HaHumidifierTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoHumidifierHaTransport } from "../../../ha/demo/humidifier";

const meta = {
  title: "Orb/Connected/Humidifier",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/** The real store, mapper, actions and history path over an injected demo transport. */
function DemoConnectedHumidifier() {
  const store = useMemo(() => createHaStore(createDemoHumidifierHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaHumidifierTile entityId="humidifier.bedroom" />
        <HaHumidifierTile entityId="humidifier.office" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedHumidifier /> };
