import type { HumidifierEntity, HumidifierHistory } from "@scope/core/entities/humidifier/types";
import { ACTION_LABEL, fmtHumidity, modeLabel, targetVerb } from "@scope/core/entities/humidifier/labels";
import { HumidifierIcon } from "./icons";
import { Orb, CardTitle, SheetClose, Stepper, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, fmtDuration, paint, useCard, detailsSheet } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./HumidifierCard.css";

export interface HumidifierCardProps extends CardProps {
  entity: HumidifierEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: HumidifierHistory;
  /** Orb, and the Turn on pill: switch it off, or back on. */
  onToggle: () => void;
  onTargetChange?: (humidity: number) => void;
  onModeChange?: (mode: string) => void;
}

/** HA sets humidity in whole percent. */
const STEP = 1;

/**
 * One humidifier or dehumidifier (`humidifier.*`). It uses the same card anatomy and footprint matrix
 * as every other card: the orb switches it; the slot sets the target humidity; the name, or a press and
 * hold on the orb, opens the sheet with its modes and today's history.
 */
export function HumidifierCard({ entity: e, history, variant, footprint, showControl, onToggle, onTargetChange, onModeChange, onOpenDetails, onClose, color }: HumidifierCardProps) {
  const { uid, nameId, sheet, compact, bare, article, area } = useCard("hu", { variant, footprint, showControl, area: e.area });
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A state: on is the accent, with no glow. Humidifying is not light or heat, so it never claims the
  // energy bloom (attention-budget skill); the action words say whether it is working.
  const colors = paint("state", 0, null, color);

  const cur = unav ? undefined : e.currentHumidity;
  const target = on ? e.targetHumidity : undefined;
  const action = on ? e.action : undefined;
  const statusParts = [cur != null ? `${fmtHumidity(cur)}%${compact ? "" : " now"}` : null, unav ? "Unavailable" : action ? ACTION_LABEL[action] : !on ? ACTION_LABEL.off : null].filter(Boolean);
  // With nothing measured or reported, the status line names the room, as a toggle's does.
  const status = statusParts.length ? statusParts.join(" · ") : area;
  const setText = unav ? "Unavailable" : !on ? "Off" : target != null ? `Set ${fmtHumidity(target)}%` : e.mode ? modeLabel(e.mode) : "On";

  let slot;
  if (unav) slot = <UnavailableSlot lastSeen={e.lastSeen} />;
  else if (!on) slot = <TogglePill label={`${e.name}: Off, turn on`} on={false} onToggle={onToggle} turnOn>Turn on</TogglePill>;
  else if (target != null && onTargetChange) {
    slot = <Stepper label={`${e.name} target humidity`} kicker={compact ? undefined : targetVerb(e.kind)} value={target} unit="%" format={fmtHumidity} min={e.minHumidity} max={e.maxHumidity} step={STEP} onChange={onTargetChange} />;
  } else {
    const word = target != null ? `${fmtHumidity(target)}%` : "On";
    const cue = e.mode ? modeLabel(e.mode) : undefined;
    slot = <TogglePill label={`${e.name}: ${word}${cue ? ` · ${cue}` : ""}`} on onToggle={onToggle} extra={cue}>{word}</TogglePill>;
  }

  // The compact value appears under the name, or in place of a hidden control.
  const subText = cur != null ? `${fmtHumidity(cur)}% · ${setText}` : setText;
  const summary = !history ? "" : unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : history.onMinutes > 0 ? `On ${fmtDuration(history.onMinutes)}` : "Not on today";

  return (
    <article {...article} data-state={e.state} data-action={action ?? (on ? "on" : "off")} {...colors}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={0.7} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          <HumidifierIcon kind={e.kind} />
        </Orb>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area">{sheet && area && status !== area ? `${area} · ${status}` : status}</p>
          {compact && <p className="hd-sub">{subText}</p>}
        </CardTitle>
        <p className="hd-num" aria-hidden="true">{cur == null ? null : <>{fmtHumidity(cur)}<span>%</span></>}</p>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
      </header>

      <div className="hd-slot">{bare ? <p className="hd-val">{setText}</p> : slot}</div>

      {sheet && !unav && onModeChange && e.modes && e.modes.length > 1 && (
        <div className="hd-extra">
          <ChoiceChips id={`${uid}-m`} label="Mode" options={e.modes.map((m) => ({ value: m, label: modeLabel(m) }))} value={e.mode} onChange={onModeChange} />
        </div>
      )}

      {history && <TodayStrip samples={history.samples} currentHour={history.currentHour} summary={summary} />}

      {sheet && (
        <p className="hd-info">
          <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : `Target range ${fmtHumidity(e.minHumidity)}–${fmtHumidity(e.maxHumidity)}%`}</span>
          <span>{unav ? "" : e.lastChanged ? `Last changed ${e.lastChanged}` : ""}</span>
        </p>
      )}
    </article>
  );
}

export type HumidifierSheetProps = SheetProps<HumidifierCardProps>;

export const HumidifierSheet = detailsSheet(HumidifierCard);
