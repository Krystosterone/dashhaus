import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { FieldPage, Area, Areas } from "./layout";
import type { FieldFootprint } from "../shared/ui";
import { LightModule } from "../cards/light/LightModule";
import { LIGHT_SEEDS, useDemoLight } from "@dashhaus/core/seeds/light";
import type { LightSeedName as LightSeedName } from "@dashhaus/core/seeds/light";
import { ClimateModule } from "../cards/climate/ClimateModule";
import { CLIMATE_SEEDS, useDemoClimate } from "@dashhaus/core/seeds/climate";
import type { ClimateSeedName } from "@dashhaus/core/seeds/climate";
import { SensorModule } from "../cards/sensor/SensorModule";
import { SENSOR_SEEDS } from "@dashhaus/core/seeds/sensor";
import type { SensorSeedName } from "@dashhaus/core/seeds/sensor";
import { WeatherModule } from "../cards/weather/WeatherModule";
import { WEATHER_SEEDS } from "@dashhaus/core/seeds/weather";
import type { WeatherSeedName } from "@dashhaus/core/seeds/weather";
import { ToggleModule } from "../cards/toggle/ToggleModule";
import { TOGGLE_SEEDS, useDemoToggle } from "@dashhaus/core/seeds/toggle";
import type { ToggleSeedName } from "@dashhaus/core/seeds/toggle";
import { HumidifierModule } from "../cards/humidifier/HumidifierModule";
import { HUMIDIFIER_SEEDS, useDemoHumidifier } from "@dashhaus/core/seeds/humidifier";
import type { HumidifierSeedName } from "@dashhaus/core/seeds/humidifier";
import { SoundModule } from "../cards/sound/SoundModule";
import { SOUND_SEEDS, useDemoSound } from "@dashhaus/core/seeds/sound";
import type { SoundSeedName } from "@dashhaus/core/seeds/sound";
import { CoverModule } from "../cards/cover/CoverModule";
import { COVER_SEEDS, useDemoCover } from "@dashhaus/core/seeds/cover";
import type { CoverSeedName } from "@dashhaus/core/seeds/cover";
import { AlarmModule } from "../cards/alarm/AlarmModule";
import { ALARM_SEEDS, useDemoAlarm } from "@dashhaus/core/seeds/alarm";
import type { AlarmSeedName } from "@dashhaus/core/seeds/alarm";
import { OwletModule } from "../cards/owlet/OwletModule";
import { OWLET_SEEDS } from "@dashhaus/core/seeds/owlet";
import type { OwletSeedName } from "@dashhaus/core/seeds/owlet";

/*
 * Examples of composing a field page, one per device. They show the composition rules (spec/field.md → Dashboards),
 * not every card: a card earns a place here by showing something about a page, and each one's own stories show the rest.
 */

/** A device-sized frame so each page is seen at its real width. The content scrolls inside. */
function Device({ label, width, height, children }: { label: string; width: number; height: number; children: ReactNode }) {
  return (
    <figure style={{ margin: "24px auto", width, maxWidth: "100%", display: "grid", gap: 8 }}>
      <figcaption style={{ font: "600 11px var(--fd-sans)", fontStretch: "var(--fd-wide)", letterSpacing: "0.06em", color: "var(--fd-ink-2)", paddingInline: 8 }}>
        {label.toUpperCase()} · {width} × {height}
      </figcaption>
      <div style={{ height, overflowY: "auto", borderRadius: 28, boxShadow: "inset 0 0 0 1px var(--fd-hairline)" }}>{children}</div>
    </figure>
  );
}

/** The example time, fixed so screenshots stay stable; every module's demo is at 11:54 too. */
const NOW = new Date(2026, 9, 17, 11, 54);

/**
 * What every example module takes: its seed, its footprint, and, where its section is a place, that place, so a plate
 * never names another room than its legend; and a shorter name where the place already says it ("Air").
 */
interface Placed { footprint?: FieldFootprint; area?: string; name?: string }
const placed = <T extends { area?: string; name: string }>(entity: T, { area, name }: Placed): T =>
  ({ ...entity, ...(area ? { area } : {}), ...(name ? { name } : {}) });

function Light({ seed, footprint, ...own }: Placed & { seed: LightSeedName }) {
  const demo = useDemoLight(LIGHT_SEEDS[seed]);
  return <LightModule {...demo} entity={placed(demo.entity, own)} footprint={footprint} />;
}
function Climate({ seed, footprint, ...own }: Placed & { seed: ClimateSeedName }) {
  const demo = useDemoClimate(CLIMATE_SEEDS[seed]);
  return <ClimateModule {...demo} entity={placed(demo.entity, own)} footprint={footprint} />;
}
function Sensor({ seed, footprint, ...own }: Placed & { seed: SensorSeedName }) {
  const { entity, history } = SENSOR_SEEDS[seed];
  return <SensorModule entity={placed(entity, own)} history={history} footprint={footprint} />;
}
function Weather({ seed, footprint, ...own }: Placed & { seed: WeatherSeedName }) {
  const { entity, history, hourly, daily } = WEATHER_SEEDS[seed];
  return <WeatherModule entity={placed(entity, own)} history={history} hourly={hourly} daily={daily} footprint={footprint} />;
}
function Toggle({ seed, footprint, ...own }: Placed & { seed: ToggleSeedName }) {
  const demo = useDemoToggle(TOGGLE_SEEDS[seed]);
  return <ToggleModule {...demo} entity={placed(demo.entity, own)} footprint={footprint} />;
}
function Humidifier({ seed, footprint, ...own }: Placed & { seed: HumidifierSeedName }) {
  const demo = useDemoHumidifier(HUMIDIFIER_SEEDS[seed]);
  return <HumidifierModule entity={placed(demo.entity, own)} history={demo.history} onToggle={demo.onToggle} onTargetChange={demo.onTargetChange} onModeChange={demo.onModeChange} footprint={footprint} />;
}
function Sound({ seed, footprint, ...own }: Placed & { seed: SoundSeedName }) {
  const demo = useDemoSound(SOUND_SEEDS[seed]);
  return <SoundModule entity={placed(demo.entity, own)} history={demo.history} onToggle={demo.onToggle} onVolumeChange={demo.onVolumeChange} footprint={footprint} />;
}
function Cover({ seed, footprint, ...own }: Placed & { seed: CoverSeedName }) {
  const demo = useDemoCover(COVER_SEEDS[seed]);
  return (
    <CoverModule
      entity={placed(demo.entity, own)}
      history={demo.history}
      onOpenCover={demo.onOpenCover}
      onCloseCover={demo.onCloseCover}
      onStopCover={demo.onStopCover}
      onSetPosition={demo.onSetPosition}
      onSetTilt={demo.onSetTilt}
      footprint={footprint}
    />
  );
}
function Alarm({ seed, footprint, ...own }: Placed & { seed: AlarmSeedName }) {
  const demo = useDemoAlarm(ALARM_SEEDS[seed]);
  return <AlarmModule entity={placed(demo.entity, own)} history={demo.history} onArm={demo.onArm} onDisarm={demo.onDisarm} footprint={footprint} />;
}
/** An Owlet sock; its base station switches locally. */
function Owlet({ seed, footprint, ...own }: Placed & { seed: OwletSeedName }) {
  const { entity, history } = OWLET_SEEDS[seed];
  const [baseOn, setBaseOn] = useState(entity.baseOn ?? true);
  return <OwletModule entity={{ ...placed(entity, own), baseOn }} history={history} footprint={footprint} onBaseToggle={() => setBaseOn((on) => !on)} />;
}

const meta = {
  title: "Field/Dashboards/Examples",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Examples of composing a field page per device. Not a template, and not every card: each shows a way to order a page for a glance. Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The phone's page: what is pressed most first, each plate keeping its own room, then the nursery, then the rooms. */
function PhonePage({ footprint, sock }: { footprint: FieldFootprint; sock: OwletSeedName }) {
  const f = { footprint };
  return (
    <FieldPage title="Home" now={NOW}>
      <Area title="Quick" {...f}>
        <Light seed="dimmable" {...f} />
        <Toggle seed="dnd" {...f} />
        <Alarm seed="disarmed" {...f} />
        <Cover seed="garage" {...f} />
      </Area>
      <Area title="Nursery" {...f}>
        <Owlet seed={sock} area="Nursery" {...f} />
        <Light seed="nightLight" area="Nursery" {...f} />
        <Sound seed="on" area="Nursery" {...f} />
        <Humidifier seed="on" area="Nursery" name="Humidifier" {...f} />
      </Area>
      <Area title="Rooms" {...f}>
        <Sensor seed="living" {...f} />
        <Sensor seed="bathroom" {...f} />
        <Sensor seed="basement" {...f} />
        <Sensor seed="outdoor" {...f} />
      </Area>
    </FieldPage>
  );
}

/** Phone: every module a 64 px row, so the house reads in about one screen: the four things pressed most, the
    nursery, then each room's air. A row's key, name and screen line up down the column whatever the card. */
export const Phone: Story = {
  render: () => (
    <Device label="Phone" width={390} height={844}>
      <PhonePage footprint="compact" sock="deep" />
    </Device>
  ),
};

/** Tablet, landscape: whole modules, an area a row of four, so every fader and today's meter is in reach;
    the living room first, then the nursery, then outside. */
export const Tablet: Story = {
  render: () => (
    <Device label="Tablet, landscape" width={1180} height={820}>
      <FieldPage title="Home" now={NOW} showTime>
        <Area title="Living room">
          <Light seed="dimmable" area="Living room" />
          <Light seed="dimmableOff" area="Living room" />
          <Climate seed="heating" area="Living room" />
          <Cover seed="curtains" area="Living room" />
        </Area>
        <Area title="Nursery">
          <Owlet seed="deep" area="Nursery" />
          <Light seed="nightLight" area="Nursery" />
          <Sound seed="on" area="Nursery" />
          <Humidifier seed="on" area="Nursery" name="Humidifier" />
        </Area>
        <Area title="Outside">
          <Weather seed="partly" name="Weather" />
          <Sensor seed="outdoor" area="Outside" name="Air" />
          <Light seed="onOff" area="Outside" />
          <Cover seed="garage" area="Outside" />
        </Area>
      </FieldPage>
    </Device>
  ),
};

/** The wall panel's page, read up close or across the room. */
function WallPage({ viewing }: { viewing?: "far" }) {
  return (
    <FieldPage title="Home" now={NOW} showTime viewing={viewing}>
      <Areas columns={4}>
        <Area title="Living room">
          <Light seed="dimmable" area="Living room" />
          <Climate seed="heating" area="Living room" />
          <Cover seed="curtains" area="Living room" footprint="compact" />
          <Sensor seed="living" name="Air" footprint="compact" />
        </Area>
        <Area title="Nursery">
          <Owlet seed="deep" area="Nursery" />
          <Light seed="nightLight" area="Nursery" />
          <Sound seed="on" area="Nursery" footprint="compact" />
          <Humidifier seed="on" area="Nursery" name="Humidifier" footprint="compact" />
        </Area>
        <Area title="Whole home">
          <Alarm seed="away" area="Whole home" />
          <Toggle seed="dnd" area="Whole home" footprint="compact" />
          <Toggle seed="guest" area="Whole home" footprint="compact" />
          <Cover seed="garage" area="Whole home" footprint="compact" />
        </Area>
        <Area title="Outside">
          <Weather seed="partly" name="Weather" />
          <Light seed="onOff" area="Outside" footprint="compact" />
          <Sensor seed="outdoor" area="Outside" name="Air" footprint="compact" />
        </Area>
      </Areas>
    </FieldPage>
  );
}

/** Wall panel, landscape: one column per place, its leads whole modules and the rest 64 px rows under them; the whole
    1280 × 800 surface fits without scrolling. */
export const WallPanel: Story = {
  name: "Wall panel",
  render: () => (
    <Device label="Wall panel" width={1280} height={800}>
      <WallPage />
    </Device>
  ),
};

/** The same wall panel read from across the room (`viewing="far"`): names, the area and screen lines, legends and key
    words a step up, the screens' figures a weight up; every height as near, so it still fits without scrolling. */
export const WallPanelFar: Story = {
  name: "Wall panel, far",
  render: () => (
    <Device label="Wall panel, far" width={1280} height={800}>
      <WallPage viewing="far" />
    </Device>
  ),
};

/** Phone, whole modules, the sock's alarm below the fold: the module stays in its place in the nursery, and the alert
    line under the header names it on the first screen; a tap opens the sock's panel. Nothing moves to make room. */
export const PhoneAlarm: Story = {
  name: "Phone, alarm below the fold",
  render: () => (
    <Device label="Phone" width={390} height={844}>
      <PhonePage footprint="standard" sock="critical" />
    </Device>
  ),
};
