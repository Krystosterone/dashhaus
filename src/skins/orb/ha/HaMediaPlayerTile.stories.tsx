import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HaMediaPlayerTile } from "./HaMediaPlayerTile";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoMediaPlayerHaTransport } from "@dashhaus/core/demo";

const meta = {
  title: "Orb/Connected/MediaPlayer",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The real store, mapper, actions, artwork and history path over an injected demo transport: the speaker plays with its
 * artwork, served by the transport as Home Assistant's proxy would; skip on for the next track's own.
 */
function DemoConnectedMediaPlayer() {
  const store = useMemo(() => createHaStore(createDemoMediaPlayerHaTransport()), []);
  return (
    <HaProvider store={store}>
      <div style={{ width: 420, maxWidth: "90vw", display: "grid", gap: 8 }}>
        <HaMediaPlayerTile entityId="media_player.kitchen_speaker" area="Kitchen" footprint="featured" />
        <HaMediaPlayerTile entityId="media_player.kitchen_speaker" area="Kitchen" footprint="compact" />
        <HaMediaPlayerTile entityId="media_player.living_room_tv" area="Living room" footprint="compact" />
      </div>
    </HaProvider>
  );
}

export const InjectedTransport: Story = { render: () => <DemoConnectedMediaPlayer /> };
