import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaMediaPlayerModule } from "./HaMediaPlayerModule";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoMediaPlayerHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Field/Connected/MediaPlayer",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

function DemoConnectedMediaPlayer() {
  const store = useMemo(() => createHaStore(createDemoMediaPlayerHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 340, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaMediaPlayerModule entityId="media_player.kitchen_speaker" area="Kitchen" />
        <HaMediaPlayerModule entityId="media_player.kitchen_speaker" area="Kitchen" footprint="compact" />
        <HaMediaPlayerModule entityId="media_player.living_room_tv" area="Living room" footprint="compact" />
      </div>
    </HaProvider>
  );
}

/**
 * The same skin-free hook orb's media player tile uses, over the demo transport: the modules follow the store, the
 * artwork served as Home Assistant's proxy would; Next brings the next track's own.
 */
export const InjectedTransport: Story = { render: () => <DemoConnectedMediaPlayer /> };
