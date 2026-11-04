import { useId } from "react";
import type { ReactNode } from "react";
import type { SoundEntity, SoundHistory } from "@dashhaus/core/entities/sound/types";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Digits, Fader, Key, ModuleFrame, Pictogram, Screen, Today, useDetails, Facts, PanelBody, Channel } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconSound, SPEAKER } from "./icons";
import "./SoundModule.css";

export interface SoundModuleProps {
  entity: SoundEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave the panel without it. */
  history?: SoundHistory;
  onToggle: () => void;
  /** Panel: set the volume, as a percent of the device's range. Omit, or a sound with no volume, and there is no fader. */
  onVolumeChange?: (percent: number) => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** A volume in its three fixed places: the leading digits unlit, read as the bare number. */
const Volume = ({ value }: { value: number }) => <><Digits value={value} /><small>%</small></>;

/**
 * A sound machine's sound (`switch.*`) as a field module. The key switches it and its LED says it's on. The screen
 * leads with the volume beside a speaker filled to it, in the volume's colour, the panel fader thumb's; off, it says
 * OFF with the volume on the meta line. The volume is set in the panel only: it rarely changes, and a stray tap on
 * a fader beside a sleeping baby would jump it, so the module's row is the key alone. The name, or a press and hold
 * on the key, opens the detail panel: the volume fader and today.
 */
export function SoundModule({ entity: e, footprint = "standard", history, onToggle, onVolumeChange, defaultOpen = false }: SoundModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const volume = unav ? undefined : e.volume;

  // The speaker fills to the volume and lights only while it plays; a sound without one has no parameter, so it is neutral.
  const pict = <Pictogram level={volume == null ? 1 : volume / 100} lit={on} param={volume != null ? "a" : "neutral"}>{SPEAKER}</Pictogram>;
  const read: ReactNode = unav ? <Blank label="Unavailable" /> : !on ? "OFF" : volume != null ? <Volume value={volume} /> : "ON";
  const since = sinceFact(e.lastChanged);
  const meta: [ReactNode, ReactNode?] | undefined = unav ? ["Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : undefined]
    : on && volume != null ? ["Playing", since]
    : !on && volume != null ? [`Volume ${volume}%`, since]
    : since ? [since]
    : undefined;
  // Square at the head of a compact row; across the row with its state word, which unavailable has none of.
  const key = (wide: boolean) => (
    <Key label={e.name} pressed={on} unavailable={unav} onPress={onToggle} onHold={details.openDetails} wide={wide} caption={wide && !unav ? (on ? "On" : "Off") : undefined}>
      <IconSound />
    </Key>
  );

  return (
    <ModuleFrame kind="fd-sn" name={e.name} area={e.area} footprint={footprint} state={e.state} details={details} pict={pict} read={read} meta={meta} lead={key(false)} row={key(true)}>
      <SoundDetails e={e} read={read} pict={pict} meta={meta} control={key(true)} history={history} onVolumeChange={onVolumeChange} />
    </ModuleFrame>
  );
}

interface DetailsProps {
  e: SoundEntity;
  read: ReactNode;
  pict: ReactNode;
  meta?: [ReactNode, ReactNode?];
  control: ReactNode;
  history?: SoundHistory;
  onVolumeChange?: (percent: number) => void;
}

/**
 * The panel's content: the screen, with the volume on its second channel while the sound is off; the key; the
 * volume fader, which never switches the sound, so it stays unlit while off; today; and facts.
 */
function SoundDetails({ e, read, pict, meta, control, history, onVolumeChange }: DetailsProps) {
  const uid = useId();
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const volume = unav ? undefined : e.volume;
  const today = history && (unav ? "Unavailable" : todaySummary("on", history.onMinutes));

  // Playing, the figure is the volume already; off, it says OFF, so the volume moves to the second channel.
  const aside = !on && volume != null ? (
    <Channel pict={<Pictogram lit={false} level={volume / 100}>{SPEAKER}</Pictogram>} sub="Volume"><Volume value={volume} /></Channel>
  ) : undefined;

  return (
    <PanelBody className="fd-sn-panel" state={e.state}>
      <Screen pict={pict} meta={meta} aside={aside}>{read}</Screen>
      {control}

      {volume != null && onVolumeChange && (
        <Fader
          id={`${uid}-vol`}
          label={`${e.name} volume`}
          legend={on ? `Volume ${volume}%` : `Off · ${volume}%`}
          value={volume}
          min={0}
          max={100}
          lit={on}
          valueText={`${volume} percent`}
          onChange={onVolumeChange}
        />
      )}

      {history && <Today summary={today} label="On by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}

      <Facts start={unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged)} end={unav ? "" : volume != null ? "On / off, volume" : "On / off"} />
    </PanelBody>
  );
}
