import type { LightEntity, LightHistory } from "@dashhaus/core/entities/light/types";
import { kelvinName, K_MIN, K_MAX } from "@dashhaus/core/entities/light/kelvin";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { lampColorOf } from "./color";
import type { Hs } from "./color";
import { CardFrame, ChoiceChips, SheetBlock, Today, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import { QUICK_LEVELS, lightAbilities, lightWord } from "@dashhaus/core/entities/light/words";
import { IconBulb, IconBulbOff, BrightnessBar, WarmthRuler, ColorChips } from "./parts";
import "./LightCard.css";

export interface LightCardProps extends CardProps {
  entity: LightEntity;
  /** Shown at L size and in the sheet. Omit to hide the Today strip. */
  history?: LightHistory;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. The orb keeps its tap and hold actions. Default true.
   */
  showControl?: boolean;
  onToggle: () => void;
  onBrightnessChange: (percent: number) => void;
  onKelvinChange?: (kelvin: number) => void;
  /** Sheet: set the colour, as HA `hs_color`. Omit to hide the colour chips. */
  onColorChange?: (hs: Hs) => void;
  /** Card only: the name and press-and-hold on the bulb call this. */
  onOpenDetails?: () => void;
  /** Sheet only: the close button calls this. */
  onClose?: () => void;
}

/**
 * One light entity. The shared footprint matrix fixes its height independently of state and entity type.
 */
export function LightCard({ entity: e, history, variant, footprint, showControl, onToggle, onBrightnessChange, onKelvinChange, onColorChange, onOpenDetails, onClose }: LightCardProps) {
  const card = useCard("lw", { variant, footprint, showControl, area: e.area });
  const { uid, sheet, area } = card;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const hasBrightness = e.supportsBrightness && e.brightness != null;
  // The bar keeps the slot whatever the light's state, so the control never changes under a finger. Home Assistant
  // reports no brightness while a light is off or unknown, and the bar needs none then: sliding it turns the light on.
  // Only a lit light with no reading yet keeps the pill, since the bar would show a level it never reported.
  const dims = e.supportsBrightness && !unav && (hasBrightness || !on);
  // Adapters hand over normalized percent; keep an absent reading out of controls and readouts.
  const pct = e.brightness == null ? 100 : Math.min(100, Math.max(1, Math.round(e.brightness)));
  const glow = on ? (hasBrightness ? pct / 100 : 0.85) : 0;
  const intensity = hasBrightness ? pct / 100 : 0.85;
  // Lit is energy: the orb and the bar fill with the accent. Warmth and colour are told in words, not by colouring the orb.
  const colors = paint("energy", glow);

  // Unknown (reachable but not reported yet) switches and dims, so it is drawn as a light that isn't lit, in its own word.
  const word = lightWord(e);
  const readout = unav ? null : on && hasBrightness ? <>{pct}<span>%</span></> : word;
  const valueText = on && hasBrightness ? `${pct}%` : word;

  // A lit lamp's colour, when it shows one rather than a colour temperature.
  const lamp = on && e.supportsColor && e.hs ? lampColorOf(e.hs) : null;
  // The warmth or colour in words, for the status line of a lit lamp.
  const warmth = on && e.supportsColorTemp && e.kelvin != null ? kelvinName(e.kelvin) : lamp?.name ?? null;
  const colorChips = !!(e.supportsColor && onColorChange);
  // With no room to name (a titled bundle's lid names it), the status line carries the light's own detail.
  // Unavailable, since when it was last seen.
  const since = unav ? e.lastSeen : e.lastChanged;
  const detail = warmth ?? (sinceFact(since) ?? null);

  // The compact value appears under the name, or in place of a hidden control.
  const subText = valueText;
  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, ...colors }}
      orb={{ label: e.name, pressed: on, intensity, onToggle, children: unav ? <IconBulbOff /> : <IconBulb /> }}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={area ? <>{area}{warmth && <span className="lw-k"> · {warmth}</span>}</> : !sheet && detail}
      statusTitle={area}
      value={subText}
      readout={{ value: readout, duplicate: true, word: !(on && hasBrightness) }}
      onClose={onClose}
      control={dims ? <BrightnessBar id={`${uid}-dim`} label={`${e.name} brightness`} value={pct} on={on} known={hasBrightness} offText={word} onChange={onBrightnessChange} />
        : <TogglePill label={`${e.name}: ${word}`} on={on} onToggle={onToggle}>{word}</TogglePill>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: lightAbilities(e) }}
    >
      {!unav && (
        <SheetBlock>
          {dims && (
            <ChoiceChips id={`${uid}-lv`} label="Quick levels" options={QUICK_LEVELS} value={on ? pct : null} onChange={onBrightnessChange} />
          )}
          {e.supportsColorTemp && e.kelvin != null && onKelvinChange && (
            <WarmthRuler id={`${uid}-k`} kelvin={e.kelvin} min={e.minKelvin ?? K_MIN} max={e.maxKelvin ?? K_MAX} disabled={!on} onChange={onKelvinChange} />
          )}
          {colorChips && <ColorChips id={`${uid}-c`} value={lamp} onChange={(c) => onColorChange?.(c.hs)} />}
        </SheetBlock>
      )}
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary("on", history.onMinutes)} />}
    </CardFrame>
  );
}

export type LightSheetProps = SheetProps<LightCardProps>;

/** The light's detail view in a modal sheet. */
export const LightSheet = detailsSheet(LightCard);
