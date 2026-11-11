import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FieldPage, Area, Areas } from "../dashboards/layout";
import type { FieldFootprint } from "../shared/ui";
import { LightModule } from "../cards/light/LightModule";
import { LIGHT_SEEDS, useDemoLight } from "@dashhaus/core/seeds/light";
import type { LightSeedName } from "@dashhaus/core/seeds/light";
import { ClimateModule } from "../cards/climate/ClimateModule";
import { CLIMATE_SEEDS, useDemoClimate } from "@dashhaus/core/seeds/climate";
import type { ClimateSeedName } from "@dashhaus/core/seeds/climate";
import { CoverModule } from "../cards/cover/CoverModule";
import { COVER_SEEDS, useDemoCover } from "@dashhaus/core/seeds/cover";
import type { CoverSeedName } from "@dashhaus/core/seeds/cover";
import { LockModule } from "../cards/lock/LockModule";
import { LOCK_SEEDS, useDemoLock } from "@dashhaus/core/seeds/lock";
import type { LockSeedName } from "@dashhaus/core/seeds/lock";
import { BinarySensorModule } from "../cards/binarySensor/BinarySensorModule";
import { BINARY_SENSOR_SEEDS, useDemoBinarySensor } from "@dashhaus/core/seeds/binarySensor";
import type { BinarySensorSeedName } from "@dashhaus/core/seeds/binarySensor";

/*
 * The scan-task comparison (issue #186) on Field: Orb → Foundations → Scan task's pages, the same rooms in the same
 * order under the same names, so both skins' budgets are judged on one task, "Is anything at home that needs you?".
 * Field has no glow to damp, so each page is drawn once: its alert line under the title is what it brings to the task.
 * Orb's featured hero is a whole module here, and its compact rows are rows.
 */

/** The example time, fixed so screenshots stay stable; every module's demo is at 11:54 too. */
const NOW = new Date(2026, 9, 17, 11, 54);

const meta = {
  title: "Field/Foundations/Scan task",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The pages for the scan-task comparison, as Orb draws them: plain areas, the lit hero above or below the urgent module, on a phone and a 1280 × 800 wall panel. Show a page on its own (the story's canvas, full screen) so its name doesn't give the answer away. Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A device-sized frame so each page is seen at its real size; the content scrolls inside, as on the device. */
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

/** A module's seed, its footprint, and the area it sits in, so a plate never names another room than its legend. */
interface Placed { footprint?: FieldFootprint; area: string; name?: string }
const placed = <T extends { area?: string; name: string }>(entity: T, { area, name }: Placed): T => ({ ...entity, area, ...(name ? { name } : {}) });

function Light({ seed, footprint, ...own }: Placed & { seed: LightSeedName }) {
  const demo = useDemoLight(LIGHT_SEEDS[seed]);
  return <LightModule {...demo} entity={placed(demo.entity, own)} footprint={footprint} />;
}
function Climate({ seed, footprint, ...own }: Placed & { seed: ClimateSeedName }) {
  const demo = useDemoClimate(CLIMATE_SEEDS[seed]);
  return <ClimateModule {...demo} entity={placed(demo.entity, own)} footprint={footprint} />;
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
function Lock({ seed, footprint, ...own }: Placed & { seed: LockSeedName }) {
  const demo = useDemoLock(LOCK_SEEDS[seed]);
  return <LockModule {...demo} entity={placed(demo.entity, own)} footprint={footprint} />;
}
function BinarySensor({ seed, footprint, ...own }: Placed & { seed: BinarySensorSeedName }) {
  const { entity, history } = useDemoBinarySensor(BINARY_SENSOR_SEEDS[seed]);
  return <BinarySensorModule entity={placed(entity, own)} history={history} footprint={footprint} />;
}

const row = { footprint: "compact" } as const;

/* The rooms every page is built from, as Orb's. */
const Living = () => (
  <Area title="Living room">
    <Light seed="dimmableNoWarmth" area="Living room" name="Floor lamp" />
    <Climate seed="heating" area="Living room" {...row} />
    <Cover seed="curtains" area="Living room" {...row} />
  </Area>
);
const Hall = () => (
  <Area title="Hall">
    <Lock seed="locked" area="Hall" />
    <Light seed="onOff" area="Hall" {...row} />
  </Area>
);
const QuietGarage = () => (
  <Area title="Garage">
    <Cover seed="garage" area="Garage" />
    <Light seed="onOff" area="Garage" name="Garage lights" {...row} />
  </Area>
);
const QuietKitchen = () => (
  <Area title="Kitchen">
    <Light seed="dimmable" area="Kitchen" name="Pendants" />
    <BinarySensor seed="open" area="Kitchen" />
    <BinarySensor seed="lowBattery" area="Kitchen" {...row} />
  </Area>
);

/** The lit hero first in the kitchen, the leak under it. */
const heroAbove = [
  <Living key="living" />,
  <Area key="kitchen" title="Kitchen">
    <Light seed="dimmable" area="Kitchen" name="Pendants" />
    <BinarySensor seed="leak" area="Kitchen" />
    <BinarySensor seed="lowBattery" area="Kitchen" {...row} />
  </Area>,
  <Hall key="hall" />,
  <QuietGarage key="garage" />,
];

/** The jammed lock first in the garage, the lit hero under it. */
const heroBelow = [
  <Living key="living" />,
  <Area key="garage" title="Garage">
    <Lock seed="jammed" area="Garage" />
    <Light seed="dimmable" area="Garage" name="Garage lights" />
    <Cover seed="garage" area="Garage" {...row} />
  </Area>,
  <QuietKitchen key="kitchen" />,
  <Hall key="hall" />,
];

/** Advisory states and a lit hero, nothing urgent: what a "yes" here counts is a false alarm. */
const nothingUrgent = [<Living key="living" />, <QuietKitchen key="kitchen" />, <Hall key="hall" />, <QuietGarage key="garage" />];

function Phone({ children }: { children: ReactNode }) {
  return (
    <Device label="Phone" width={390} height={844}>
      <FieldPage title="Home" now={NOW}>{children}</FieldPage>
    </Device>
  );
}

function Wall({ children }: { children: ReactNode }) {
  return (
    <Device label="Wall panel" width={1280} height={800}>
      <FieldPage title="Home" now={NOW} showTime viewing="far">
        <Areas columns={4}>{children}</Areas>
      </FieldPage>
    </Device>
  );
}

export const PhoneHeroAbove: Story = { name: "Phone, hero above", render: () => <Phone>{heroAbove}</Phone> };
export const PhoneHeroBelow: Story = { name: "Phone, hero below", render: () => <Phone>{heroBelow}</Phone> };
export const PhoneNothingUrgent: Story = { name: "Phone, nothing urgent", render: () => <Phone>{nothingUrgent}</Phone> };
export const WallHeroAbove: Story = { name: "Wall panel, hero above", render: () => <Wall>{heroAbove}</Wall> };
export const WallHeroBelow: Story = { name: "Wall panel, hero below", render: () => <Wall>{heroBelow}</Wall> };
export const WallNothingUrgent: Story = { name: "Wall panel, nothing urgent", render: () => <Wall>{nothingUrgent}</Wall> };
