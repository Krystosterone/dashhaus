import type { HumidifierEntity, HumidifierHistory } from "@dashhaus/core/entities/humidifier/types";
import { ACTION_LABEL, fmtHumidity, modeLabel, targetVerb } from "@dashhaus/core/entities/humidifier/labels";
import { lastChangedFact, lastSeenFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { HumidifierIcon } from "./icons";
import { CardFrame, ChoiceChips, SheetBlock, Stepper, Today, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
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
  const card = useCard("hu", { variant, footprint, showControl, area: e.area });
  const { uid, sheet, compact, area } = card;
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
  if (!on) slot = <TogglePill label={`${e.name}: Off, turn on`} on={false} onToggle={onToggle} turnOn>Turn on</TogglePill>;
  else if (target != null && onTargetChange) {
    slot = <Stepper label={`${e.name} target humidity`} kicker={compact ? undefined : targetVerb(e.kind)} value={target} unit="%" format={fmtHumidity} min={e.minHumidity} max={e.maxHumidity} step={STEP} onChange={onTargetChange} />;
  } else {
    const word = target != null ? `${fmtHumidity(target)}%` : "On";
    const cue = e.mode ? modeLabel(e.mode) : undefined;
    slot = <TogglePill label={`${e.name}: ${word}${cue ? ` · ${cue}` : ""}`} on onToggle={onToggle} extra={cue}>{word}</TogglePill>;
  }

  // The compact value appears under the name, or in place of a hidden control.
  const subText = cur != null ? `${fmtHumidity(cur)}% · ${setText}` : setText;

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, "data-action": action ?? (on ? "on" : "off"), ...colors }}
      orb={{ label: e.name, pressed: on, intensity: 0.7, onToggle, children: <HumidifierIcon kind={e.kind} /> }}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={sheet && area && status !== area ? `${area} · ${status}` : status}
      value={subText}
      bareValue={setText}
      readout={{ value: cur == null ? null : <>{fmtHumidity(cur)}<span>%</span></> }}
      onClose={onClose}
      control={slot}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : `Target range ${fmtHumidity(e.minHumidity)}–${fmtHumidity(e.maxHumidity)}%`, end: unav ? "" : lastChangedFact(e.lastChanged) }}
    >
      {!unav && onModeChange && e.modes && e.modes.length > 1 && (
        <SheetBlock>
          <ChoiceChips id={`${uid}-m`} label="Mode" options={e.modes.map((m) => ({ value: m, label: modeLabel(m) }))} value={e.mode} onChange={onModeChange} />
        </SheetBlock>
      )}
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary("on", history.onMinutes)} />}
    </CardFrame>
  );
}

export type HumidifierSheetProps = SheetProps<HumidifierCardProps>;

export const HumidifierSheet = detailsSheet(HumidifierCard);
