import type { SoundEntity, SoundHistory } from "@dashhaus/core/entities/sound/types";
import { lastChangedFact, lastSeenFact, sinceFact, unavailableSince } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { SoundIcon } from "./icons";
import { VolumeBar } from "./parts";
import { Orb, CardTitle, SheetClose, TogglePill, UnavailableSlot, TodayStrip, paint, useCard, detailsSheet, Facts } from "../../shared/ui";
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
export function SoundCard({ entity: e, history, variant, footprint, showControl, onToggle, onVolumeChange, onOpenDetails, onClose, color }: SoundCardProps) {
  const { uid, nameId, sheet, compact, bare, article, area } = useCard("sn", { variant, footprint, showControl, area: e.area });
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A state: on is the accent, with no glow. "energy" (bloom and glow) is for light, heat or daylight; see the attention-budget skill.
  const colors = paint("state", 0, null, color);
  // The control carries the state word; the status line never repeats it.
  const word = unav ? "Unavailable" : on ? "On" : "Off";
  // The pill's second voice: what tapping does, or how long it has been on.
  const cue = on ? sinceFact(e.lastChanged) : "Turn on";
  // With no room to name (a titled bundle's lid names it), the status line carries the volume instead.
  const volume = !unav && e.volume != null ? `Volume ${e.volume}%` : null;
  // Unavailable, since when it was last seen.
  const since = unav ? e.lastSeen : e.lastChanged;

  return (
    <article {...article} data-state={e.state} {...colors}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={0.7} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          <SoundIcon />
        </Orb>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area" title={area}>{area ? <>{area}{volume && <span className="sn-vol"> · {volume}</span>}</> : !sheet && (volume ?? (sinceFact(since) ?? null))}</p>
          {compact && <p className="hd-sub">{word}</p>}
        </CardTitle>
        {/* The large readout is the volume, which no card control prints; without one it repeats the pill's word. */}
        {e.volume != null && !unav
          ? <p className="hd-num" aria-hidden="true">{e.volume}<span>%</span></p>
          : <p className="hd-num hd-num--control-duplicate" aria-hidden="true">{unav ? null : word}</p>}
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
      </header>

      <div className="hd-slot">
        {bare ? <p className="hd-val">{word}</p> : unav
          ? <UnavailableSlot lastSeen={e.lastSeen} />
          : <TogglePill label={`${e.name}: ${word}${cue ? ` · ${cue}` : ""}`} on={on} onToggle={onToggle} extra={cue}>{word}</TogglePill>}
      </div>

      {sheet && !unav && e.volume != null && onVolumeChange && (
        <div className="hd-extra">
          <VolumeBar id={`${uid}-vol`} value={e.volume} on={on} onChange={onVolumeChange} />
        </div>
      )}

      {history && (
        <TodayStrip
          samples={history.samples}
          currentHour={history.currentHour}
          summary={unav ? unavailableSince(e.lastSeen) : todaySummary("on", history.onMinutes)}
        />
      )}

      {sheet && (
        <Facts start={unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged)} end={unav && e.area ? e.area : ""} />
      )}
    </article>
  );
}

export type SoundSheetProps = SheetProps<SoundCardProps>;

export const SoundSheet = detailsSheet(SoundCard);
