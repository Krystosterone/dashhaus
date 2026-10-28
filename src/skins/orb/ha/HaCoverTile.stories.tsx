import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaCoverTile } from "./HaCoverTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoCoverHaTransport } from "../../../ha/demo/cover";

const meta = {
  title: "Orb/Home Assistant/Cover",
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
