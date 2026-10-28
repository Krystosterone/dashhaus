import { JoinedBundle, LeadBundle, TitledBundle } from "../Bundle";
import { ToggleTile } from "../../cards/toggle/ToggleTile";
import { LightTile } from "../../cards/light/LightTile";
import { ClimateTile } from "../../cards/climate/ClimateTile";
import { SoundTile } from "../../cards/sound/SoundTile";
import { TOGGLE_SEEDS, useDemoToggle } from "../../cards/toggle/demo/useDemoToggle";
import { SEEDS as LIGHT_SEEDS, useDemoLight } from "../../cards/light/demo/useDemoLight";
import { CLIMATE_SEEDS, useDemoClimate } from "../../cards/climate/demo/useDemoClimate";
import { SOUND_SEEDS, useDemoSound } from "../../cards/sound/demo/useDemoSound";
import type { ToggleSeedName } from "../../cards/toggle/demo/useDemoToggle";
import type { CardFootprint } from "../../shared/ui";

export type BundleName = "sleep" | "nursery" | "upstairs" | "stressJoined" | "stressLead" | "stressTitled";

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

type TProps = { seed: ToggleSeedName; footprint?: CardFootprint } & Open;

const T = ({ seed, footprint, defaultOpen }: TProps) =>
  <ToggleTile {...useDemoToggle(TOGGLE_SEEDS[seed])} footprint={footprint} defaultOpen={defaultOpen} />;

/** Nova Sleep and Do Not Disturb: two modes that belong together, no header. */
function Sleep() {
  return (
    <JoinedBundle label="Sleep">
      <T key="a" seed="novaSleep" />
      <T key="b" seed="dnd" />
    </JoinedBundle>
  );
}

/** One sound machine, three entities, under a lid that names the machine and its room once. Each part is
 *  named for what it is on the machine: the power (it starts and ends every nap), the night light (switched
 *  on its own for feeds) and the white noise, whose volume is in its sheet. */
function Nursery() {
  const power = useDemoToggle(TOGGLE_SEEDS.soundMachine);
  const light = useDemoLight(LIGHT_SEEDS.nightLight);
  const sound = useDemoSound(SOUND_SEEDS.on);
  return (
    <TitledBundle title="Sound machine" area="Nursery">
      <ToggleTile key="power" {...power} />
      <LightTile key="light" {...light} />
      <SoundTile key="sound" {...sound} />
    </TitledBundle>
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

/** A title and room long enough to truncate, an unavailable part, and a part in another room, which keeps its own. */
function StressTitled() {
  const power = useDemoToggle(TOGGLE_SEEDS.soundMachine);
  const light = useDemoLight(LIGHT_SEEDS.unavailable, { name: "Kinderzimmer-Nachtlicht mit Sternenhimmel", area: "Nursery" });
  const sound = useDemoSound(SOUND_SEEDS.long);
  return (
    <TitledBundle title="Kinderzimmer-Schlafgerät mit Nachtlicht und Geräuschen" area="Nursery">
      <ToggleTile key="power" {...power} />
      <LightTile key="light" {...light} />
      <SoundTile key="sound" {...sound} />
    </TitledBundle>
  );
}

const BUNDLES: Record<BundleName, (p: Open) => JSX.Element> = { sleep: Sleep, nursery: Nursery, upstairs: Upstairs, stressJoined: StressJoined, stressLead: StressLead, stressTitled: StressTitled };
