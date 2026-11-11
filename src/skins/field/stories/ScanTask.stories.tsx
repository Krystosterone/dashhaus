import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FieldPage, Area, Areas } from "../dashboards/layout";
import type { FieldFootprint } from "../shared/ui";
import { LightModule } from "../cards/light/LightModule";
import { LIGHT_SEEDS, useDemoLight } from "@dashhaus/core/seeds/light";
import type { LightSeedName } from "@dashhaus/core/seeds/light";
import { ClimateModule } from "../cards/climate/ClimateModule";
import { CLIMATE_SEEDS, useDemoClimate } from "@dashhaus/core/seeds/climate";
import { CoverModule } from "../cards/cover/CoverModule";
import { COVER_SEEDS, useDemoCover } from "@dashhaus/core/seeds/cover";
import type { CoverSeed } from "@dashhaus/core/seeds/cover";
import { LockModule } from "../cards/lock/LockModule";
import { LOCK_SEEDS, useDemoLock } from "@dashhaus/core/seeds/lock";
import type { LockSeed } from "@dashhaus/core/seeds/lock";
import { BinarySensorModule } from "../cards/binarySensor/BinarySensorModule";
import { BINARY_SENSOR_SEEDS, useDemoBinarySensor } from "@dashhaus/core/seeds/binarySensor";
import type { BinarySensorSeed } from "@dashhaus/core/seeds/binarySensor";
import { VacuumModule } from "../cards/vacuum/VacuumModule";
import { VACUUM_SEEDS, useDemoVacuum } from "@dashhaus/core/seeds/vacuum";
import type { VacuumSeed } from "@dashhaus/core/seeds/vacuum";
import { OwletModule } from "../cards/owlet/OwletModule";
import { OWLET_SEEDS } from "@dashhaus/core/seeds/owlet";
import type { OwletSeed } from "@dashhaus/core/seeds/owlet";
import { SCAN_CATCH, SCAN_PAGES, ScanOrder, scanStoryName } from "../../../../.storybook/blocks/ScanPlan";
import type { ScanDevice, ScanPage } from "../../../../.storybook/blocks/ScanPlan";

/*
 * The scan-task comparison (issues #186 and #188) on Field: Orb → Foundations → Scan task's pages, from the same plan
 * (.storybook/blocks/ScanPlan.tsx), so both skins' budgets are judged on one task, "Is anything at home that needs
 * you?". Field has no glow to damp and its own alert line, so each page is drawn once, named by its codes alone. Orb's
 * featured lamp is a whole module here, and its compact rows are rows.
 */

/** The example time, fixed so screenshots stay stable; every module's demo is at 11:54 too. */
const NOW = new Date(2026, 9, 17, 11, 54);

const meta = {
  title: "Field/Foundations/Scan task",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The pages for the scan-task comparison, as Orb draws them (issues #186 and #188), named by codes alone: the facilitator's order says which page each participant sees, and in which position. Show a page on its own (the story's canvas, full screen). Example data; the time is fixed at 11:54." } },
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

/** A seed moved to the page's room, under the plan's name, so a plate never names another room than its legend. */
const placed = <S extends { entity: { area?: string; name: string } }>(seed: S, area: string, name?: string): S =>
  ({ ...seed, entity: { ...seed.entity, area, ...(name ? { name } : {}) } });

const row = "compact" satisfies FieldFootprint;

function Light({ seed, area, name, footprint }: { seed: LightSeedName; area: string; name?: string; footprint?: FieldFootprint }) {
  const demo = useDemoLight(LIGHT_SEEDS[seed], { area, ...(name ? { name } : {}) });
  return <LightModule {...demo} footprint={footprint} />;
}
function Climate({ area }: { area: string }) {
  const demo = useDemoClimate(CLIMATE_SEEDS.heating);
  return <ClimateModule {...demo} entity={{ ...demo.entity, area }} footprint={row} />;
}
function Cover({ seed, footprint }: { seed: CoverSeed; footprint?: FieldFootprint }) {
  const demo = useDemoCover(seed);
  return (
    <CoverModule
      entity={demo.entity}
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
function Lock({ seed }: { seed: LockSeed }) {
  const demo = useDemoLock(seed);
  return <LockModule {...demo} />;
}
function BinarySensor({ seed }: { seed: BinarySensorSeed }) {
  const { entity, history } = useDemoBinarySensor(seed);
  return <BinarySensorModule entity={entity} history={history} />;
}
function Vacuum({ seed }: { seed: VacuumSeed }) {
  const demo = useDemoVacuum(seed);
  return (
    <VacuumModule
      entity={demo.entity}
      history={demo.history}
      onStart={demo.onStart} onPause={demo.onPause} onReturnToBase={demo.onReturnToBase} onLocate={demo.onLocate} onFanSpeedChange={demo.onFanSpeedChange}
    />
  );
}
/** An Owlet sock; its base station switches locally. */
function Owlet({ seed }: { seed: OwletSeed }) {
  const [baseOn, setBaseOn] = useState(seed.entity.baseOn ?? true);
  return <OwletModule entity={{ ...seed.entity, baseOn }} history={seed.history} onBaseToggle={() => setBaseOn((on) => !on)} />;
}

function Problem({ page }: { page: ScanPage }) {
  switch (page.problem) {
    case "leak": return <BinarySensor seed={placed(BINARY_SENSOR_SEEDS.leak, page.room, page.name)} />;
    case "jammed": return <Lock seed={placed(LOCK_SEEDS.jammed, page.room, page.name)} />;
    case "vacuum": return <Vacuum seed={placed(VACUUM_SEEDS.error, page.room, page.name)} />;
    case "sockOff": return <Owlet seed={placed(OWLET_SEEDS.sockOff, page.room, page.name)} />;
  }
}

/** The page's areas, as Orb's sections: the living room, the problem's room (or the den), the dining room, the driveway. */
function rooms(page: ScanPage | undefined): ReactNode[] {
  const room = page?.room ?? SCAN_CATCH.room;
  const beside = page ? <Problem key="problem" page={page} /> : <BinarySensor key="door" seed={placed(BINARY_SENSOR_SEEDS.open, room)} />;
  const lamp = <Light key="lamp" seed="dimmable" area={room} name="Ceiling" />;
  return [
    <Area key="living" title="Living room">
      <Light seed="dimmableNoWarmth" area="Living room" name="Floor lamp" />
      <Climate area="Living room" />
      <Cover seed={placed(COVER_SEEDS.curtains, "Living room")} footprint={row} />
    </Area>,
    <Area key="problem" title={room}>{page?.lamp === "below" ? [beside, lamp] : [lamp, beside]}</Area>,
    <Area key="dining" title="Dining room">
      <BinarySensor seed={placed(BINARY_SENSOR_SEEDS.lowBattery, "Dining room", "Smoke detector")} />
      <Light seed="onOff" area="Dining room" name="Sideboard lamp" footprint={row} />
    </Area>,
    <Area key="driveway" title="Driveway">
      <Cover seed={placed(COVER_SEEDS.garage, "Driveway")} />
      <Light seed="onOff" area="Driveway" footprint={row} />
    </Area>,
  ];
}

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

const FRAMES = { phone: Phone, wall: Wall };

/** One trial's page: page 1 to 6 of a device, or page 7, the catch page. */
function scan(device: ScanDevice, page: number): Story {
  const Frame = FRAMES[device];
  return { name: scanStoryName(device, page), render: () => <Frame>{rooms(SCAN_PAGES[device][page - 1])}</Frame> };
}

/** Not a study page: which page each participant sees, in which position, and what each page holds. */
export const FacilitatorOrder: Story = { name: "Facilitator order", render: () => <ScanOrder skin="field" /> };

export const Phone1: Story = scan("phone", 1);
export const Phone2: Story = scan("phone", 2);
export const Phone3: Story = scan("phone", 3);
export const Phone4: Story = scan("phone", 4);
export const Phone5: Story = scan("phone", 5);
export const Phone6: Story = scan("phone", 6);
export const Phone7: Story = scan("phone", 7);
export const Wall1: Story = scan("wall", 1);
export const Wall2: Story = scan("wall", 2);
export const Wall3: Story = scan("wall", 3);
export const Wall4: Story = scan("wall", 4);
export const Wall5: Story = scan("wall", 5);
export const Wall6: Story = scan("wall", 6);
export const Wall7: Story = scan("wall", 7);
