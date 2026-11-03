import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { FuturaFootprint } from "../shared/ui";
import { FuturaLightCard } from "../cards/light/FuturaLightCard";
import { LIGHT_SEEDS as LIGHTS, useDemoLight } from "@dashhaus/core/seeds/light";
import type { LightSeedName as LightName } from "@dashhaus/core/seeds/light";
import { FuturaClimateCard } from "../cards/climate/FuturaClimateCard";
import { CLIMATE_SEEDS, useDemoClimate } from "@dashhaus/core/seeds/climate";
import type { ClimateSeedName } from "@dashhaus/core/seeds/climate";
import { FuturaToggleCard } from "../cards/toggle/FuturaToggleCard";
import { TOGGLE_SEEDS, useDemoToggle } from "@dashhaus/core/seeds/toggle";
import type { ToggleSeedName } from "@dashhaus/core/seeds/toggle";
import { FuturaSensorCard } from "../cards/sensor/FuturaSensorCard";
import { SENSOR_SEEDS } from "@dashhaus/core/seeds/sensor";
import type { SensorSeedName } from "@dashhaus/core/seeds/sensor";
import { FuturaWeatherCard } from "../cards/weather/FuturaWeatherCard";
import { WEATHER_SEEDS } from "@dashhaus/core/seeds/weather";
import { FuturaCell, FuturaColumns, FuturaPage, FuturaSection } from "./layout";
import { FuturaNavBar } from "./NavBar";

const meta = { title: "Studies/Futura/Dashboards/Examples", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const NOW = new Date(2026, 9, 17, 11, 54);

type Fp = { footprint?: FuturaFootprint };
function Light({ seed, footprint }: { seed: LightName } & Fp) {
  const demo = useDemoLight(LIGHTS[seed]);
  return <FuturaLightCard entity={demo.entity} history={demo.history} onToggle={demo.onToggle} onBrightnessChange={demo.onBrightnessChange} footprint={footprint} />;
}
function Climate({ seed, footprint }: { seed: ClimateSeedName } & Fp) {
  const demo = useDemoClimate(CLIMATE_SEEDS[seed]);
  return <FuturaClimateCard entity={demo.entity} history={demo.history} onToggle={demo.onToggle} onTargetChange={demo.onTargetChange} onRangeChange={demo.onRangeChange} onModeChange={demo.onModeChange} footprint={footprint} />;
}
function Toggle({ seed, footprint }: { seed: ToggleSeedName } & Fp) {
  const demo = useDemoToggle(TOGGLE_SEEDS[seed]);
  return <FuturaToggleCard entity={demo.entity} history={demo.history} onToggle={demo.onToggle} footprint={footprint} />;
}
const Sensor = ({ seed, footprint }: { seed: SensorSeedName } & Fp) => <FuturaSensorCard entity={SENSOR_SEEDS[seed].entity} history={SENSOR_SEEDS[seed].history} footprint={footprint} />;
const Weather = ({ footprint }: Fp) => <FuturaWeatherCard entity={WEATHER_SEEDS.partly.entity} history={WEATHER_SEEDS.partly.history} footprint={footprint} />;

function Nav({ pages }: { pages: string[] }) {
  const [current, setCurrent] = useState(pages[0]);
  return <FuturaNavBar items={pages.map((label) => ({ key: label, label, kind: "section" as const, current: current === label, onSelect: () => setCurrent(label) }))} />;
}

/** A phone: the weather and the main light as standard cards, then each room as compact rows. */
function PhoneExample() {
  return (
    <div style={{ width: 390, maxWidth: "100%", margin: "0 auto" }}>
      <FuturaPage title="Home" showTime now={NOW} nav={<Nav pages={["Home", "Living room", "Nursery"]} />}>
        <FuturaSection title="Now" note="11:54 · 2 lit">
          <Weather />
          <Light seed="dimmable" />
        </FuturaSection>
        <FuturaSection title="Living room" note="4 devices" footprint="compact">
          <Light seed="dimmableOff" footprint="compact" />
          <Climate seed="heating" footprint="compact" />
          <Sensor seed="living" footprint="compact" />
          <Toggle seed="guest" footprint="compact" />
        </FuturaSection>
        <FuturaSection title="Nursery" note="Quiet hours" footprint="compact">
          <Light seed="nightLight" footprint="compact" />
          <Toggle seed="whiteNoise" footprint="compact" />
          <Climate seed="nurseryDyson" footprint="compact" />
        </FuturaSection>
      </FuturaPage>
    </div>
  );
}

/** A tablet on the wall of the living room: its controls on the left, outside and the house's modes on the right. */
function TabletExample() {
  return (
    <FuturaPage title="Living room" subtitle="Saturday 17 October · ground floor" showTime now={NOW} nav={<Nav pages={["Living room", "Bedrooms", "Outside", "Modes"]} />}>
      <FuturaColumns columns={3}>
        <FuturaCell span={2}>
          <FuturaSection title="Climate and light" note="2 lit · heating" columns={2}>
            <Light seed="dimmable" />
            <Light seed="dimmableOff" />
            <Climate seed="heating" />
            <Sensor seed="living" />
          </FuturaSection>
        </FuturaCell>
        <FuturaSection title="Outside" note="Updated 11:50" columns={1}>
          <Weather />
          <Sensor seed="outdoor" />
        </FuturaSection>
      </FuturaColumns>
      <FuturaSection title="Modes" note="Whole home" footprint="compact">
        <Toggle seed="guest" footprint="compact" />
        <Toggle seed="dnd" footprint="compact" />
        <Toggle seed="away" footprint="compact" />
        <Toggle seed="unavailable" footprint="compact" />
      </FuturaSection>
    </FuturaPage>
  );
}

/** A wall panel: every room at once, standard cards in three columns. */
function WallPanelExample() {
  return (
    <FuturaPage title="Home" showTime now={NOW}>
      <FuturaColumns columns={3}>
        <FuturaSection title="Living room" columns={1}>
          <Light seed="dimmable" />
          <Climate seed="heating" />
          <Sensor seed="living" />
        </FuturaSection>
        <FuturaSection title="Nursery" columns={1}>
          <Light seed="nightLight" />
          <Climate seed="nurseryDyson" />
          <Toggle seed="whiteNoise" />
        </FuturaSection>
        <FuturaSection title="Outside" columns={1}>
          <Weather />
          <Sensor seed="outdoor" />
          <Toggle seed="away" />
        </FuturaSection>
      </FuturaColumns>
    </FuturaPage>
  );
}

export const Phone: Story = { render: () => <PhoneExample /> };
export const Tablet: Story = { render: () => <TabletExample /> };
export const WallPanel: Story = { name: "Wall panel", render: () => <WallPanelExample /> };
