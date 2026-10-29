import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaCoverModule } from "./HaCoverModule";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoCoverHaTransport } from "../../../ha/demo/cover";
import type { HassEntities } from "../../../ha/types";

const stamp = "2026-10-19T11:20:00Z";
/** The demo's blinds, and a garage door that only opens and closes. */
const SEED: HassEntities = {
  "cover.living_room": {
    entity_id: "cover.living_room",
    state: "open",
    attributes: { friendly_name: "Living room blinds", device_class: "blind", current_position: 100, current_tilt_position: 50, supported_features: 4 | 8 | 128 },
    last_changed: stamp,
    last_updated: stamp,
  },
  "cover.garage_door": {
    entity_id: "cover.garage_door",
    state: "closed",
    attributes: { friendly_name: "Garage door", device_class: "garage", supported_features: 1 | 2 | 8 },
    last_changed: stamp,
    last_updated: stamp,
  },
};

const meta = {
  title: "Field/Connected/Cover",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedCover() {
  const store = useMemo(() => createHaStore(createDemoCoverHaTransport(SEED)), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaCoverModule entityId="cover.living_room" />
        <HaCoverModule entityId="cover.living_room" footprint="compact" />
        <HaCoverModule entityId="cover.garage_door" />
      </div>
    </HaProvider>
  );
}

/** The same skin-free hook orb's cover tile uses, over the demo transport: every module follows the store. */
export const InjectedTransport: Story = { render: () => <DemoConnectedCover /> };
