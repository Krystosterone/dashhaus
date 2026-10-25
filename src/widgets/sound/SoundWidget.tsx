import type { SoundEntity, SoundHistory } from "./types";
import { SoundIcon } from "./icons";
import { VolumeBar } from "./parts";
import { Orb, CardTitle, SheetClose, TogglePill, UnavailableSlot, TodayStrip, fmtDuration, paint, useCard, detailsSheet } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./SoundWidget.css";

export interface SoundWidgetProps extends CardProps {
  entity: SoundEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: SoundHistory;
  onToggle: () => void;
  /** Sheet: set the volume, as a percent of the device's range. Omit to hide the volume groove. */
  onVolumeChange?: (percent: number) => void;
}

/**
 * A sound machine's sound (`switch.*`), switched on and off, with its volume. It uses the same card anatomy and
 * footprint matrix as every other widget: the orb and the pill toggle it; the name, or a press and hold on the
 * orb, opens the sheet. The volume is set in the sheet only: it rarely changes, and a stray tap on a groove
 * beside a sleeping baby would jump it.
 */
export function SoundWidget({ entity: e, history, variant, footprint, showControl, onToggle, onVolumeChange, onOpenDetails, onClose, color }: SoundWidgetProps) {
  const { uid, nameId, sheet, compact, bare, article } = useCard("sn", { variant, footprint, showControl });
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A state: on is the accent, with no glow. "energy" (bloom and glow) is for light, heat or daylight; see the attention-budget skill.
  const colors = paint("state", 0, null, color);
  // The control carries the state word; the status line never repeats it.
  const word = unav ? "Unavailable" : on ? "On" : "Off";
  // The pill's second voice: what tapping does, or how long it has been on.
  const cue = on ? (e.lastChanged ? `Since ${e.lastChanged}` : undefined) : "Turn on";

  return (
    <article {...article} data-state={e.state} {...colors}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={0.7} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          <SoundIcon />
        </Orb>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area" title={e.area}>{e.area}{!unav && e.volume != null && <span className="sn-vol">{e.area ? " · " : ""}Volume {e.volume}%</span>}</p>
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
          summary={unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : history.onMinutes > 0 ? `On ${fmtDuration(history.onMinutes)}` : "Not on today"}
        />
      )}

      {sheet && (
        <p className="hd-info">
          <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastChanged ? `Last changed ${e.lastChanged}` : ""}</span>
          <span>{unav && e.area ? e.area : ""}</span>
        </p>
      )}
    </article>
  );
}

export type SoundSheetProps = SheetProps<SoundWidgetProps>;

export const SoundSheet = detailsSheet(SoundWidget);
