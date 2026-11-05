import type { SoundEntity, SoundHistory } from "@dashhaus/core/entities/sound/types";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { SoundIcon } from "./icons";
import { VolumeBar } from "./parts";
import { CardFrame, SheetBlock, Today, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./SoundCard.css";

export interface SoundCardProps extends CardProps {
  entity: SoundEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: SoundHistory;
  onToggle: () => void;
  /** Sheet: set the volume, as a percent of the device's range. Omit to hide the volume groove. */
  onVolumeChange?: (percent: number) => void;
}

/**
 * A sound machine's sound (`switch.*`), switched on and off, with its volume. It uses the same card anatomy and
 * footprint matrix as every other card: the orb and the pill toggle it; the name, or a press and hold on the
 * orb, opens the sheet. The volume is set in the sheet only: it rarely changes, and a stray tap on a groove
 * beside a sleeping baby would jump it.
 */
export function SoundCard({ entity: e, history, variant, footprint, showControl, onToggle, onVolumeChange, onOpenDetails, onClose }: SoundCardProps) {
  const card = useCard("sn", { variant, footprint, showControl, area: e.area });
  const { uid, sheet, area } = card;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A state: on is the accent, with no glow. "energy" (bloom and glow) is for light, heat or daylight; see the attention-budget skill.
  const colors = paint("state", 0);
  // The control carries the state word; the status line never repeats it.
  const word = unav ? "Unavailable" : on ? "On" : "Off";
  // The pill's second voice: what tapping does, or how long it has been on.
  const cue = on ? sinceFact(e.lastChanged) : "Turn on";
  // With no room to name (a titled bundle's lid names it), the status line carries the volume instead.
  const volume = !unav && e.volume != null ? `Volume ${e.volume}%` : null;
  // Unavailable, since when it was last seen.
  const since = unav ? e.lastSeen : e.lastChanged;

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, ...colors }}
      orb={{ label: e.name, pressed: on, intensity: 0.7, onToggle, children: <SoundIcon /> }}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={area ? <>{area}{volume && <span className="sn-vol"> · {volume}</span>}</> : !sheet && (volume ?? (sinceFact(since) ?? null))}
      statusTitle={area}
      value={word}
      // The large readout is the volume, which no card control prints; without one it repeats the pill's word.
      readout={e.volume != null && !unav ? { value: <>{e.volume}<span>%</span></> } : { value: unav ? null : word, duplicate: true }}
      onClose={onClose}
      control={<TogglePill label={`${e.name}: ${word}${cue ? ` · ${cue}` : ""}`} on={on} onToggle={onToggle} extra={cue}>{word}</TogglePill>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav && e.area ? e.area : "" }}
    >
      {!unav && e.volume != null && onVolumeChange && (
        <SheetBlock>
          <VolumeBar id={`${uid}-vol`} value={e.volume} on={on} onChange={onVolumeChange} />
        </SheetBlock>
      )}
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary("on", history.onMinutes)} />}
    </CardFrame>
  );
}

export type SoundSheetProps = SheetProps<SoundCardProps>;

export const SoundSheet = detailsSheet(SoundCard);
