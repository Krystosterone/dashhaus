import type { Meta, StoryObj } from "@storybook/react";
import { MediaPlayerModule } from "./MediaPlayerModule";
import type { FieldFootprint } from "../../shared/ui";
import { MEDIA_PLAYER_SEEDS, MEDIA_PLAYER_WORST_CASE, useDemoMediaPlayer } from "@dashhaus/core/seeds/mediaPlayer";
import type { MediaPlayerSeed, MediaPlayerSeedName } from "@dashhaus/core/seeds/mediaPlayer";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(MEDIA_PLAYER_SEEDS) as MediaPlayerSeedName[];

function DemoMediaPlayer({ seed, width, footprint, defaultOpen }: { seed: MediaPlayerSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoMediaPlayer(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <MediaPlayerModule
        entity={demo.entity}
        history={demo.history}
        onPlay={demo.onPlay} onPause={demo.onPause} onPrevious={demo.onPrevious} onNext={demo.onNext} onTurnOn={demo.onTurnOn} onTurnOff={demo.onTurnOff} onVolumeChange={demo.onVolumeChange} onSourceChange={demo.onSourceChange} onMuteChange={demo.onMuteChange}
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function StoryMediaPlayer({ mediaPlayer, ...props }: { mediaPlayer: MediaPlayerSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoMediaPlayer seed={MEDIA_PLAYER_SEEDS[mediaPlayer]} {...props} />;
}

const meta = {
  title: "Field/Cards/MediaPlayer",
  component: StoryMediaPlayer,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One media player (`media_player.*`) as a field module. The screen says PLAY, HOLD, IDLE, ON, STBY or OFF beside the artwork, a " +
          "window in the screen square at its height; the meta lines say the title, then the artist; a rule along the screen's foot lights as " +
          "it plays, running on by itself. The first key prints what a press does (Pause, Play, Turn on), its LED the playing signal; then " +
          "Next. Tap the name, or press and hold a key, for the panel: the time played as a running segment clock, Previous, Play and Next, " +
          "the volume fader, Mute, Power, the source and today. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    mediaPlayer: { control: "select", options: SEEDS, description: "Example media player" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { mediaPlayer: "playing", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryMediaPlayer key={`${args.mediaPlayer}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryMediaPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playing: Story = {};
/** Paused part way: HOLD, the meta line says Paused; the rule holds where it was. */
export const Paused: Story = { args: { mediaPlayer: "paused" } };
/** Buffering: on its way, so blank segments, the word on the meta line; its LED stays lit. */
export const Buffering: Story = { args: { mediaPlayer: "buffering" } };
/** Muted while it plays: said beside the artist. */
export const Muted: Story = { args: { mediaPlayer: "muted" } };
/** A radio stream: no duration, so no rule along the screen's foot, never a guessed one; no artwork, so the pictogram. */
export const Stream: Story = { args: { mediaPlayer: "stream" } };
export const Idle: Story = { args: { mediaPlayer: "idle" } };
/** A TV that is on with nothing it reports as playing: ON, and its source on the meta line. */
export const On: Story = { args: { mediaPlayer: "on" } };
export const Standby: Story = { args: { mediaPlayer: "standby" } };
export const Off: Story = { args: { mediaPlayer: "off" } };
/** A state Home Assistant doesn't name: blank segments, the integration's own words on the meta line. */
export const OtherState: Story = { name: "Other state", args: { mediaPlayer: "other" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { mediaPlayer: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {MEDIA_PLAYER_WORST_CASE.map((seed) => <DemoMediaPlayer key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryMediaPlayer key={name} mediaPlayer={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same media player at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["mediaPlayer", "footprint"] } },
  render: ({ mediaPlayer, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryMediaPlayer key={mediaPlayer} mediaPlayer={mediaPlayer} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["mediaPlayer", "width"] } },
  render: ({ mediaPlayer, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryMediaPlayer key={footprint} mediaPlayer={mediaPlayer} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryMediaPlayer key={name} mediaPlayer={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the artwork, the time played as a running segment clock, the keys, the volume, Mute, Power, the source and today. */
export const Details: Story = { args: { defaultOpen: true } };

/** A TV's panel: nothing playing, its sources, and Power. */
export const DetailsSources: Story = { name: "Details, sources", args: { mediaPlayer: "on", defaultOpen: true } };

/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { mediaPlayer: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
