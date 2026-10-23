import type { OwletEntity, OwletHistory } from "./types";
import { HeartIcon, OwletIcon } from "./icons";
import { SLEEP_WORD, fmtBpm, fmtOxygen, normalize } from "./readings";
import { AlertStatus, CardTitle, SheetClose, UnavailableSlot, TodayStrip, fmtDuration, paint, useCard, detailsSheet } from "../../shared/ui";
import type { CardProps, ColorProp, SheetProps } from "../../shared/ui";
import "./OwletWidget.css";

export interface OwletWidgetProps extends CardProps {
  entity: OwletEntity;
  /** Today's sleep on the featured footprint; heart rate and oxygen too in the sheet. */
  history?: OwletHistory;
  /** Card only: the name and the readings open the details sheet. */
  onOpenDetails?: () => void;
  /** The icon's colour, if any. Default: none (a bare icon). */
  color?: ColorProp;
}

/**
 * An Owlet Smart Sock: the baby's sleep state, heart rate and oxygen saturation. A reading: neutral,
 * a bare icon in place of an orb, and no glow. It reports nothing while the sock charges.
 * While readings arrive, the heart beside the heart rate beats; once they stop, it stands still, the figures
 * dim, and the status line warns since when.
 */
export function OwletWidget({ entity: e, history, variant, footprint, showControl, onOpenDetails, onClose, color }: OwletWidgetProps) {
  const { nameId, sheet, compact, bare, article } = useCard("ow", { variant, footprint, showControl });
  const sleep = e.state === "unavailable" ? undefined : e.state;
  const hr = e.heartRate, o2 = e.oxygen;
  // Off the network or charging: nothing to show. A sleep state or a reading alone still shows.
  const offline = sleep == null && hr == null && o2 == null;
  const colors = paint("reading", 0, null, color);
  // Old figures on a baby monitor are a problem state: a warn marker that leads the status line, never a glow.
  const stale = !offline && e.live === false;
  const staleText = `No new reading${e.lastUpdated ? ` since ${e.lastUpdated}` : ""}`;
  // Where the sentence would lose its time to the ellipsis, the short form keeps it.
  const staleWords = <><span className="ow-st-l">{staleText}</span><span className="ow-st-s">{e.lastUpdated ? `Stopped ${e.lastUpdated}` : "Stopped"}</span></>;
  const alertLabel = stale ? `Warning: ${e.name}'s sock has sent no new reading${e.lastUpdated ? ` since ${e.lastUpdated}` : ""}` : null;

  const sleepWord = sleep ? SLEEP_WORD[sleep] : "Sleep state unknown";
  const readings = [hr != null ? `${fmtBpm(hr)} bpm` : null, o2 != null ? `${fmtOxygen(o2)}% O₂` : null].filter(Boolean).join(" · ");
  const figures = [hr != null ? `heart rate ${fmtBpm(hr)} beats per minute` : null, o2 != null ? `oxygen ${fmtOxygen(o2)} percent` : null].filter(Boolean).join(", ");
  const spoken = !figures ? "no reading yet" : e.live ? `live, ${figures}` : stale ? `${figures}, ${staleText.toLowerCase()}` : figures;
  const where = sheet && e.area ? `${e.area} · ${sleepWord}` : sleepWord;
  const status = offline ? "Unavailable" : stale ? <><AlertStatus label={alertLabel!}>{staleWords}</AlertStatus><span className="ow-st-l"> · {sleepWord}</span></> : where;
  // Under 320px a compact row keeps only this line, so it carries the sleep state and the readings.
  const subText = offline ? "Unavailable" : [sleep ? SLEEP_WORD[sleep] : null, readings || "No reading yet"].filter(Boolean).join(" · ");

  const bar = (
    <span className="ow-bar">
      {hr != null && <span className="ow-f"><span className="ow-heart" data-live={e.live || undefined}><HeartIcon /></span>{fmtBpm(hr)}<small>bpm</small></span>}
      {o2 != null && <span className="ow-f">{fmtOxygen(o2)}<small className="ow-pct">%</small><small>O₂</small></span>}
      {hr == null && o2 == null && <span className="ow-none">No reading yet</span>}
    </span>
  );

  const hrSeries = history?.heartRate ? normalize(history.heartRate) : null;
  const o2Series = history?.oxygen ? normalize(history.oxygen) : null;
  const lowHigh = (s: { min: number | null; max: number | null }, unit: string) =>
    s.min == null || s.max == null ? "No readings yet today" : `Low ${Math.round(s.min)}${unit} · High ${Math.round(s.max)}${unit}`;

  // "unknown" while the sock reads but has no sleep state: live readings, never dimmed like an unavailable card.
  return (
    <article {...article} data-state={offline ? "unavailable" : sleep ?? "unknown"} data-alert={stale ? "warn" : undefined} data-stale={stale || undefined} {...colors}>
      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={offline || undefined}>
          <span className="hd-orb-i"><OwletIcon off={offline} /></span>
        </span>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area">{status}</p>
          {compact && <p className="hd-sub">{alertLabel ? <AlertStatus label={alertLabel}>{subText}</AlertStatus> : subText}</p>}
        </CardTitle>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
      </header>

      <div className="hd-slot">
        {bare ? <p className="hd-val">{offline ? "Unavailable" : readings || "No reading yet"}</p> : offline ? <UnavailableSlot lastSeen={e.lastSeen} />
          : sheet || !onOpenDetails
            ? <div className="ow-read" role="img" aria-label={spoken}><span aria-hidden="true">{bar}</span></div>
            : <button type="button" className="ow-read" aria-label={`${e.name}: ${spoken}. Open details`} onClick={onOpenDetails}><span aria-hidden="true">{bar}</span></button>}
      </div>

      {history && (
        <TodayStrip
          title={sheet ? "Sleep today" : "Today"}
          samples={history.sleep}
          currentHour={history.currentHour}
          summary={offline ? `Unavailable since ${e.lastSeen ?? "earlier"}` : history.asleepMinutes > 0 ? `Asleep ${fmtDuration(history.asleepMinutes)}` : "Not asleep today"}
        />
      )}

      {sheet && (hrSeries || o2Series) && (
        <div className="hd-extra">
          {hrSeries && <TodayStrip title="Heart rate today" samples={hrSeries.samples} currentHour={history!.currentHour} summary={lowHigh(hrSeries, " bpm")} />}
          {o2Series && <TodayStrip title="Oxygen today" samples={o2Series.samples} currentHour={history!.currentHour} summary={lowHigh(o2Series, "%")} />}
        </div>
      )}

      {sheet && (
        <p className="hd-info">
          <span>{offline ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastUpdated ? `${e.live ? "Live · u" : "U"}pdated ${e.lastUpdated}` : ""}</span>
          <span>{offline && e.area ? e.area : ""}</span>
        </p>
      )}
    </article>
  );
}

export type OwletSheetProps = SheetProps<OwletWidgetProps>;

export const OwletSheet = detailsSheet(OwletWidget);
