import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DashboardPage, Section, Columns } from "../dashboards/layout";
import type { Vars } from "../shared/ui";
import { DemoLightTile as Light } from "../cards/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../cards/climate/demo/DemoClimateTile";
import { DemoLockTile as Lock } from "../cards/lock/demo/DemoLockTile";
import { DemoCoverTile as Cover } from "../cards/cover/demo/DemoCoverTile";
import { DemoBinarySensorTile as BinarySensor } from "../cards/binarySensor/demo/DemoBinarySensorTile";
import { DemoVacuumTile as Vacuum } from "../cards/vacuum/demo/DemoVacuumTile";
import { DemoOwletTile as Owlet } from "../cards/owlet/demo/DemoOwletTile";
import { DemoAlarmTile as Alarm } from "../cards/alarm/demo/DemoAlarmTile";
import { BINARY_SENSOR_SEEDS } from "@dashhaus/core/seeds/binarySensor";
import { COVER_SEEDS } from "@dashhaus/core/seeds/cover";
import { LOCK_SEEDS } from "@dashhaus/core/seeds/lock";
import { OWLET_SEEDS } from "@dashhaus/core/seeds/owlet";
import { VACUUM_SEEDS } from "@dashhaus/core/seeds/vacuum";
import { UrgencyStrip } from "../../../../.storybook/blocks/UrgencyStrip";
import { SCAN_CATCH, SCAN_CONDITIONS, SCAN_PAGES, ScanOrder, scanStoryName } from "../../../../.storybook/blocks/ScanPlan";
import type { ScanCondition, ScanDevice, ScanPage } from "../../../../.storybook/blocks/ScanPlan";

/*
 * The scan-task comparison for the attention budget's urgency factor (issue #186) and the urgency strip (#188): the
 * pages a person is shown and asked "Is anything at home that needs you?". The pages, their conditions and the
 * facilitator's order are the plan's (.storybook/blocks/ScanPlan.tsx): each page the same house in plain room
 * sections, the same warm lamp right above or right below the urgent card, which is a different card in a different
 * room on every page, and page 7 with nothing urgent. Each urgent page is drawn under each condition: the factor given
 * as `--glow-damp-under-alert` on the page alone, so nothing outside these stories changes, and the strip
 * (.storybook/blocks/UrgencyStrip.tsx), a prototype nothing ships. The Storybook run's glow census checks each page at
 * its own factor (`parameters.glowBudget`, .storybook/glow-census.ts). Field → Foundations → Scan task draws the same
 * pages.
 */

/** The example time, fixed so screenshots stay stable. */
const NOW = new Date(2026, 9, 17, 11, 54);

const meta = {
  title: "Orb/Foundations/Scan task",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The pages for the scan-task comparison of the urgency factor and the urgency strip (issues #186 and #188), named by codes alone: the facilitator's order says which page and condition each participant sees, and in which position. Show a page on its own (the story's canvas, full screen). Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A device-sized frame so each page is seen at its real size; the content scrolls inside, as on the device. */
function Device({ label, width, height, children }: { label: string; width: number; height: number; children: ReactNode }) {
  return (
    <figure style={{ margin: "24px auto", width, maxWidth: "100%", display: "grid", gap: 8 }}>
      <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)", paddingInline: 8 }}>{label} · {width} × {height}</figcaption>
      <div style={{ height, overflowY: "auto", borderRadius: 36, boxShadow: "inset 0 0 0 1px var(--line), var(--shadow)" }}>{children}</div>
    </figure>
  );
}

/** A seed moved to the page's room, under the plan's name: the same example, placed, as the dashboard examples place theirs. */
const placed = <S extends { entity: { area?: string; name: string } }>(seed: S, area: string, name?: string): S =>
  ({ ...seed, entity: { ...seed.entity, area, ...(name ? { name } : {}) } });

/** The lamp the urgency factor damps: the same light, footprint and brightness on every page. */
const Lamp = ({ room }: { room: string }) => <Light light="dimmable" name="Ceiling" area={room} footprint="featured" />;

function Problem({ page }: { page: ScanPage }) {
  switch (page.problem) {
    case "leak": return <BinarySensor seed={placed(BINARY_SENSOR_SEEDS.leak, page.room, page.name)} />;
    case "jammed": return <Lock seed={placed(LOCK_SEEDS.jammed, page.room, page.name)} />;
    case "vacuum": return <Vacuum seed={placed(VACUUM_SEEDS.error, page.room, page.name)} />;
    case "sockOff": return <Owlet seed={placed(OWLET_SEEDS.sockOff, page.room, page.name)} />;
  }
}

/** The page's rooms: the living room, the problem's room (or the catch page's den), the dining room and the driveway. */
function rooms(page: ScanPage | undefined): ReactNode[] {
  const room = page?.room ?? SCAN_CATCH.room;
  const beside = page ? <Problem key="problem" page={page} /> : <BinarySensor key="door" seed={placed(BINARY_SENSOR_SEEDS.open, room)} />;
  const lamp = <Lamp key="lamp" room={room} />;
  return [
    <Section key="living" title="Living room">
      <Light light="dimmableNoWarmth" name="Floor lamp" area="Living room" />
      <Climate unit="heating" footprint="compact" />
      <Cover cover="curtains" footprint="compact" />
    </Section>,
    <Section key="problem" title={room}>{page?.lamp === "below" ? [beside, lamp] : [lamp, beside]}</Section>,
    <Section key="dining" title="Dining room">
      <BinarySensor seed={placed(BINARY_SENSOR_SEEDS.lowBattery, "Dining room", "Smoke detector")} />
      <Light light="onOff" name="Sideboard lamp" area="Dining room" footprint="compact" />
    </Section>,
    <Section key="driveway" title="Driveway">
      <Cover cover={placed(COVER_SEEDS.garage, "Driveway")} />
      <Light light="onOff" area="Driveway" footprint="compact" />
    </Section>,
  ];
}

/** With `strip`, the page is drawn under the urgency strip prototype; without, as Orb draws it today. */
function Strip({ strip, far, children }: { strip: boolean; far?: boolean; children: ReactNode }) {
  return strip ? <UrgencyStrip far={far}>{children}</UrgencyStrip> : <>{children}</>;
}

function Phone({ strip = false, children }: { strip?: boolean; children: ReactNode }) {
  return (
    <Device label="Phone" width={390} height={844}>
      <Strip strip={strip}><DashboardPage title="Home" now={NOW}>{children}</DashboardPage></Strip>
    </Device>
  );
}

function Wall({ strip = false, children }: { strip?: boolean; children: ReactNode }) {
  return (
    <Device label="Wall panel" width={1280} height={800}>
      <Strip strip={strip} far>
        <DashboardPage title="Home" now={NOW} showTime viewing="far" style={{ paddingBottom: 0 }}>
          <Columns columns={4} gap={16}>{children}</Columns>
        </DashboardPage>
      </Strip>
    </Device>
  );
}

const FRAMES = { phone: Phone, wall: Wall };

/**
 * One trial's page: page 1 to 6 of a device under one condition, or page 7, the catch page, which has nothing urgent
 * for the factor or the strip to act on. The factor is set on the page, and given to the glow census to check it by.
 */
function scan(device: ScanDevice, page: number, condition?: ScanCondition): Story {
  const { underAlert, strip } = SCAN_CONDITIONS.find((c) => c.code === condition) ?? { underAlert: 1, strip: false };
  const Frame = FRAMES[device];
  return {
    name: scanStoryName(device, page, condition),
    parameters: { glowBudget: { underAlert } },
    render: () => (
      <div style={{ "--glow-damp-under-alert": underAlert } as Vars}>
        <Frame strip={strip}>{rooms(SCAN_PAGES[device][page - 1])}</Frame>
      </div>
    ),
  };
}

/** Not a study page: which page and condition each participant sees, in which position, and what each page holds. */
export const FacilitatorOrder: Story = { name: "Facilitator order", render: () => <ScanOrder skin="orb" /> };

export const Phone1A: Story = scan("phone", 1, "A");
export const Phone1B: Story = scan("phone", 1, "B");
export const Phone1C: Story = scan("phone", 1, "C");
export const Phone1D: Story = scan("phone", 1, "D");
export const Phone1E: Story = scan("phone", 1, "E");
export const Phone1F: Story = scan("phone", 1, "F");
export const Phone2A: Story = scan("phone", 2, "A");
export const Phone2B: Story = scan("phone", 2, "B");
export const Phone2C: Story = scan("phone", 2, "C");
export const Phone2D: Story = scan("phone", 2, "D");
export const Phone2E: Story = scan("phone", 2, "E");
export const Phone2F: Story = scan("phone", 2, "F");
export const Phone3A: Story = scan("phone", 3, "A");
export const Phone3B: Story = scan("phone", 3, "B");
export const Phone3C: Story = scan("phone", 3, "C");
export const Phone3D: Story = scan("phone", 3, "D");
export const Phone3E: Story = scan("phone", 3, "E");
export const Phone3F: Story = scan("phone", 3, "F");
export const Phone4A: Story = scan("phone", 4, "A");
export const Phone4B: Story = scan("phone", 4, "B");
export const Phone4C: Story = scan("phone", 4, "C");
export const Phone4D: Story = scan("phone", 4, "D");
export const Phone4E: Story = scan("phone", 4, "E");
export const Phone4F: Story = scan("phone", 4, "F");
export const Phone5A: Story = scan("phone", 5, "A");
export const Phone5B: Story = scan("phone", 5, "B");
export const Phone5C: Story = scan("phone", 5, "C");
export const Phone5D: Story = scan("phone", 5, "D");
export const Phone5E: Story = scan("phone", 5, "E");
export const Phone5F: Story = scan("phone", 5, "F");
export const Phone6A: Story = scan("phone", 6, "A");
export const Phone6B: Story = scan("phone", 6, "B");
export const Phone6C: Story = scan("phone", 6, "C");
export const Phone6D: Story = scan("phone", 6, "D");
export const Phone6E: Story = scan("phone", 6, "E");
export const Phone6F: Story = scan("phone", 6, "F");
export const Phone7: Story = scan("phone", 7);
export const Wall1A: Story = scan("wall", 1, "A");
export const Wall1B: Story = scan("wall", 1, "B");
export const Wall1C: Story = scan("wall", 1, "C");
export const Wall1D: Story = scan("wall", 1, "D");
export const Wall1E: Story = scan("wall", 1, "E");
export const Wall1F: Story = scan("wall", 1, "F");
export const Wall2A: Story = scan("wall", 2, "A");
export const Wall2B: Story = scan("wall", 2, "B");
export const Wall2C: Story = scan("wall", 2, "C");
export const Wall2D: Story = scan("wall", 2, "D");
export const Wall2E: Story = scan("wall", 2, "E");
export const Wall2F: Story = scan("wall", 2, "F");
export const Wall3A: Story = scan("wall", 3, "A");
export const Wall3B: Story = scan("wall", 3, "B");
export const Wall3C: Story = scan("wall", 3, "C");
export const Wall3D: Story = scan("wall", 3, "D");
export const Wall3E: Story = scan("wall", 3, "E");
export const Wall3F: Story = scan("wall", 3, "F");
export const Wall4A: Story = scan("wall", 4, "A");
export const Wall4B: Story = scan("wall", 4, "B");
export const Wall4C: Story = scan("wall", 4, "C");
export const Wall4D: Story = scan("wall", 4, "D");
export const Wall4E: Story = scan("wall", 4, "E");
export const Wall4F: Story = scan("wall", 4, "F");
export const Wall5A: Story = scan("wall", 5, "A");
export const Wall5B: Story = scan("wall", 5, "B");
export const Wall5C: Story = scan("wall", 5, "C");
export const Wall5D: Story = scan("wall", 5, "D");
export const Wall5E: Story = scan("wall", 5, "E");
export const Wall5F: Story = scan("wall", 5, "F");
export const Wall6A: Story = scan("wall", 6, "A");
export const Wall6B: Story = scan("wall", 6, "B");
export const Wall6C: Story = scan("wall", 6, "C");
export const Wall6D: Story = scan("wall", 6, "D");
export const Wall6E: Story = scan("wall", 6, "E");
export const Wall6F: Story = scan("wall", 6, "F");
export const Wall7: Story = scan("wall", 7);

/**
 * Not a study page: the strip's order for review, an alarm, a jammed lock and a leak on one page. The alarm leads, the
 * two urgent cards are `+2`, and a tap on the alarm opens its sheet.
 */
const several = [
  <Section key="hall" title="Hall">
    <Lock seed="jammed" />
    <Alarm alarm="triggered" />
  </Section>,
  <Section key="kitchen" title="Kitchen">
    <BinarySensor seed="leak" />
    <Light light="dimmable" name="Pendants" area="Kitchen" />
  </Section>,
];
export const PhoneStripSeveral: Story = { name: "Phone, strip, an alarm and two urgent", render: () => <Phone strip>{several}</Phone> };
export const WallStripSeveral: Story = { name: "Wall panel, strip, an alarm and two urgent", render: () => <Wall strip>{several}</Wall> };
