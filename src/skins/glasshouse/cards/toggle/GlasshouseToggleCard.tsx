import type { ToggleEntity, ToggleHistory } from "@dashhaus/core/entities/toggle/types";
import { fmtDuration } from "@dashhaus/core/entities/format";
import { GlasshouseBars, GlasshouseCardFrame, GlasshouseFacts, GlasshouseSwitch, glasshouseWords } from "../../shared/ui";
import type { GlasshouseFootprint } from "../../shared/ui";
import { IconToggle } from "./icons";
import "./GlasshouseToggleCard.css";

export interface GlasshouseToggleCardProps {
  entity: ToggleEntity;
  history?: ToggleHistory;
  footprint?: GlasshouseFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
}

/**
 * A switch or a mode: its pill switch at the head, On or Off big on the face, and today's hours on as glowing bars.
 * Lit while on.
 */
export function GlasshouseToggleCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle }: GlasshouseToggleCardProps) {
  const unavailable = e.state === "unavailable";
  const on = e.state === "on";
  const said = glasshouseWords(e.state);
  const control = onToggle ? <GlasshouseSwitch label={e.name} on={on} unavailable={unavailable} onPress={onToggle} /> : undefined;
  const line = on && e.until ? `On until ${e.until}` : e.lastChanged ? `${said} since ${e.lastChanged}` : e.description ?? said;
  const face = (
    <>
      <div className="glasshouse-figure-row">
        <p className="glasshouse-big">{said}</p>
        <p className="glasshouse-caption">{line}{history ? ` · ${fmtDuration(history.onMinutes)} today` : ""}</p>
      </div>
      {history && <GlasshouseBars samples={history.samples} current={history.currentHour} label={`On ${fmtDuration(history.onMinutes)} today`} />}
    </>
  );
  return (
    <GlasshouseCardFrame card="toggle" name={e.name} entityId={e.entityId} area={e.area} state={e.state} summary={said} icon={<IconToggle />} footprint={footprint} lit={on} control={control} face={face} defaultOpen={defaultOpen}>
      {e.description && <p className="glasshouse-caption">{e.description}</p>}
      {history && <div className="glasshouse-sheet-chart"><GlasshouseBars samples={history.samples} current={history.currentHour} label={`On ${fmtDuration(history.onMinutes)} today`} /></div>}
      <GlasshouseFacts facts={[
        ["State", unavailable ? "Unavailable" : said],
        e.until && on && ["Until", e.until],
        history && ["On today", fmtDuration(history.onMinutes)],
        e.lastChanged && ["Last changed", e.lastChanged],
        unavailable && e.lastSeen && ["Last seen", e.lastSeen],
      ]} />
    </GlasshouseCardFrame>
  );
}
