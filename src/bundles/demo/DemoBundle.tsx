import { JoinedBundle, LeadBundle } from "../Bundle";
import { ToggleTile } from "../../widgets/toggle/ToggleTile";
import { LightTile } from "../../widgets/light/LightTile";
import { ClimateTile } from "../../widgets/climate/ClimateTile";
import { TOGGLE_SEEDS, useDemoToggle } from "../../widgets/toggle/demo/useDemoToggle";
import { SEEDS as LIGHT_SEEDS, useDemoLight } from "../../widgets/light/demo/useDemoLight";
import { CLIMATE_SEEDS, useDemoClimate } from "../../widgets/climate/demo/useDemoClimate";
import type { ToggleSeedName } from "../../widgets/toggle/demo/useDemoToggle";
import type { WidgetFootprint } from "../../shared/ui";

export type BundleName = "sleep" | "nightLight" | "upstairs" | "stressJoined" | "stressLead";

export interface DemoBundleProps {
  bundle: BundleName;
  /** Container width in px. The members size themselves from it. */
  width?: number;
  /** Open the lead's sheet on load (lead bundles only). */
  defaultOpen?: boolean;
}

/**
 * The example bundles, wired to local demo state. State lives here, above the bundle, as it would with
 * Home Assistant: the lead's sheet shows the same rows, and both copies stay in step.
 */
export function DemoBundle({ bundle, width, defaultOpen }: DemoBundleProps) {
  const B = BUNDLES[bundle];
  return <div style={{ width, maxWidth: "100%" }}><B defaultOpen={defaultOpen} /></div>;
}

type Open = { defaultOpen?: boolean };

type TProps = { seed: ToggleSeedName; footprint?: WidgetFootprint } & Open;

const T = ({ seed, footprint, defaultOpen }: TProps) =>
  <ToggleTile {...useDemoToggle(TOGGLE_SEEDS[seed])} footprint={footprint} defaultOpen={defaultOpen} />;

/** Nova Sleep Mode and Do Not Disturb: two modes that belong together, no header. */
function Sleep() {
  return (
    <JoinedBundle label="Sleep">
      <T key="a" seed="novaSleep" />
      <T key="b" seed="dnd" />
    </JoinedBundle>
  );
}

function NightLight({ defaultOpen }: Open) {
  const light = useDemoLight(LIGHT_SEEDS.nightLight);
  const noise = useDemoToggle(TOGGLE_SEEDS.whiteNoise);
  return (
    <LeadBundle lead={<LightTile {...light} defaultOpen={defaultOpen} />}>
      <ToggleTile key="noise" {...noise} />
    </LeadBundle>
  );
}

function Upstairs({ defaultOpen }: Open) {
  const hvac = useDemoClimate(CLIMATE_SEEDS.secondFloor);
  const dyson = useDemoClimate(CLIMATE_SEEDS.nurseryDyson);
  return (
    <LeadBundle lead={<ClimateTile {...hvac} defaultOpen={defaultOpen} />}>
      <ClimateTile key="dyson" {...dyson} />
    </LeadBundle>
  );
}

/** Long names, an unavailable member, three across. */
function StressJoined() {
  const names: ToggleSeedName[] = ["novaSleep", "unavailable", "guest"];
  return (
    <JoinedBundle label="Stress">
      {names.map((name) => <T key={name} seed={name} />)}
    </JoinedBundle>
  );
}

/** A lead that's off, with two rows: one unavailable. */
function StressLead({ defaultOpen }: Open) {
  const light = useDemoLight(LIGHT_SEEDS.dimmableOff, { name: "Kinderzimmer-Nachtlicht mit Sternenhimmel" });
  const noise = useDemoToggle(TOGGLE_SEEDS.whiteNoise);
  const heater = useDemoClimate(CLIMATE_SEEDS.unavailable);
  return (
    <LeadBundle lead={<LightTile {...light} defaultOpen={defaultOpen} />}>
      <ToggleTile key="noise" {...noise} />
      <ClimateTile key="heater" {...heater} />
    </LeadBundle>
  );
}

const BUNDLES: Record<BundleName, (p: Open) => JSX.Element> = { sleep: Sleep, nightLight: NightLight, upstairs: Upstairs, stressJoined: StressJoined, stressLead: StressLead };
