import { useId, useState } from "react";
import type { LightEntity } from "../domains/light/types";
import { K_MAX, K_MIN, kelvinName, kelvinToLch } from "../domains/light/kelvin";
import { GlassCard, PowerButton } from "./ui";
import type { GlassSize } from "./ui";
import "./cards.css";
import { GlassSegments, GlassTrack } from "./controls";
import { IconBulb } from "./icons";

export interface GlassLightCardProps {
  entity: LightEntity;
  onToggle: () => void;
  onBrightnessChange: (percent: number) => void;
  onKelvinChange?: (kelvin: number) => void;
  /** Set the colour, as HA `hs_color`. Omit to leave out the colour track. */
  onColorChange?: (hs: [number, number]) => void;
  size?: GlassSize;
}

type View = "brightness" | "color" | "warmth";
const VIEW_LABEL: Record<View, string> = { brightness: "Brightness", color: "Colour", warmth: "Warmth" };

/** Warmth stops from `min` to `max` Kelvin, each at the lamp's own hue. */
const warmth = (min: number, max: number) =>
  `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => {
    const { c, h } = kelvinToLch(min + ((max - min) * i) / 8);
    return `oklch(0.84 ${c} ${h}) ${(i * 12.5).toFixed(1)}%`;
  }).join(", ")})`;

/**
 * One light: brightness on a track, and the colour or warmth on their own track when the lamp has them, one at
 * a time under segments. The level is told on the subtitle beside the area, so the body keeps its two rows.
 * Moving a track turns an off light on, as Home Assistant's turn_on does.
 */
export function GlassLightCard({ entity: e, onToggle, onBrightnessChange, onKelvinChange, onColorChange, size = "m" }: GlassLightCardProps) {
  const uid = useId();
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const views: View[] = [
    ...(e.supportsBrightness ? ["brightness" as const] : []),
    ...(e.supportsColor && onColorChange ? ["color" as const] : []),
    ...(e.supportsColorTemp && onKelvinChange ? ["warmth" as const] : []),
  ];
  const [picked, setView] = useState<View>(views[0] ?? "brightness");
  const view = views.includes(picked) ? picked : views[0];

  const pct = e.brightness == null ? 100 : Math.min(100, Math.max(1, Math.round(e.brightness)));
  const kMin = e.minKelvin ?? K_MIN, kMax = e.maxKelvin ?? K_MAX;
  const kelvin = e.kelvin ?? Math.round((kMin + kMax) / 2);
  const hue = Math.round(e.hs?.[0] ?? 0);
  const level = !on ? "Off" : e.supportsBrightness && e.brightness != null ? `${pct}%` : "On";
  const tone = on && view === "warmth" && e.kelvin != null ? kelvinName(e.kelvin) : null;

  return (
    <GlassCard
      size={size}
      name={e.name}
      subtitle={unav ? e.area : [e.area, level, tone].filter(Boolean).join(" · ")}
      icon={<IconBulb />}
      state={unav ? "unavailable" : on ? "on" : "off"}
      action={<PowerButton label={e.name} on={on} unavailable={unav} onToggle={onToggle} />}
    >
      {unav ? (
        <p className="gl-quiet">Unavailable{e.lastSeen ? ` · last seen ${e.lastSeen}` : ""}</p>
      ) : !view ? (
        <p className="gl-quiet">{on ? "On" : "Off"}{e.lastChanged ? ` since ${e.lastChanged}` : ""}</p>
      ) : (
        <div className="gl-light">
          {views.length > 1
            ? <GlassSegments label={`${e.name} control`} options={views.map((v) => ({ value: v, label: VIEW_LABEL[v] }))} value={view} onChange={setView} />
            : <p className="gl-light-label">{VIEW_LABEL[view]}</p>}
          {view === "brightness" && (
            <GlassTrack id={`${uid}-b`} label={`${e.name} brightness`} value={pct} min={1} max={100} tone="fill" off={!on} valueText={on ? `${pct} percent` : `Off. Last set to ${pct} percent`} onChange={onBrightnessChange} />
          )}
          {view === "color" && (
            <GlassTrack id={`${uid}-c`} label={`${e.name} colour`} value={hue} min={0} max={360} tone="spectrum" valueText={`Hue ${hue} degrees`} onChange={(h) => onColorChange?.([h, e.hs?.[1] ?? 100])} />
          )}
          {view === "warmth" && (
            <GlassTrack id={`${uid}-k`} label={`${e.name} warmth`} value={kelvin} min={kMin} max={kMax} step={100} tone="warmth" gradient={warmth(kMin, kMax)} valueText={`${kelvinName(kelvin)}, ${kelvin} kelvin`} onChange={(k) => onKelvinChange?.(k)} />
          )}
        </div>
      )}
    </GlassCard>
  );
}
