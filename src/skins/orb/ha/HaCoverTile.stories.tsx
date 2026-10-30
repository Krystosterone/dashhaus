import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaCoverTile } from "./HaCoverTile";
import { HaProvider } from "@scope/core";
import { createHaStore } from "@scope/core";
import { createDemoCoverHaTransport } from "@scope/core/demo";

const meta = {
  title: "Orb/Connected/Cover",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedCover() {
  const store = useMemo(() => createHaStore(createDemoCoverHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw" }}>
        <HaCoverTile entityId="cover.living_room" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedCover /> };
