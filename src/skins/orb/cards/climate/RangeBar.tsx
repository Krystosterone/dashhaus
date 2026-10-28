import type { ReactNode } from "react";
import type { Vars } from "../../shared/ui";
import { useRangeSlider } from "../../../../primitives/slider";
import { fmtTarget } from "../../../../domains/climate/modes";

/**
 * Heat/cool range on one bar. HA heat_cool: target_temp_low is the heat threshold,
 * target_temp_high the cool threshold, and low <= high always.
 * Left of the low handle: heats below. Right of the high handle: cools above. The zone the unit is
 * working in fills with the accent; the rest is groove. A tick marks the room temperature.
 * Each handle shows its own value.
 * At widths of 260px and up you tap or drag anywhere on the bar: the nearest handle follows. When handles
 * overlap, the first move (or tapped side) decides which one. Below 260px and in compact cards it is a button that opens details.
 */
export function RangeBar({ id, name, low, high, current, modeCue, min, max, step, onChange, onOpen }: {
  id: string; name: string; low: number; high: number; current?: number; modeCue?: ReactNode;
  min: number; max: number; step: number;
  onChange: (low: number, high: number) => void;
  onOpen?: () => void;
}) {
  const range = useRangeSlider<HTMLDivElement>({
    low,
    high,
    min,
    max,
    step,
    inset: (root) => root.querySelector<HTMLElement>(".cw-rb-k")!.getBoundingClientRect().width / 2,
    valueText: (v, thumb) => `${thumb === "low" ? "Heat below" : "Cool above"} ${fmtTarget(v)} degrees`,
    onChange,
  });
  const { low: lo, high: hi, fraction: p } = range;
  const style = { "--lo": p(lo).toFixed(4), "--hi": p(hi).toFixed(4), ...(current != null ? { "--cur": p(current).toFixed(4) } : {}) } as Vars;

  return (
    <div className="cw-rb" style={style} {...range.rootProps}>
      <div className="cw-rb-zone cw-rb-zone--heat" />
      <div className="cw-rb-zone cw-rb-zone--cool" />
      {current != null && <i className="cw-rb-cur" aria-hidden="true" />}
      {/* Narrow and compact: one readout. Wider standard/featured cards: values ride the handles. */}
      <span className="cw-rb-lab" aria-hidden="true"><span>{modeCue && <span className="cw-control-mode">{modeCue}</span>}{lo === hi ? fmtTarget(lo) : `${fmtTarget(lo)}–${fmtTarget(hi)}`}°</span></span>
      <div className="cw-rb-rail" aria-hidden="true">
        <div className="cw-rb-at cw-rb-at--lo"><i className="cw-rb-k cw-rb-k--lo">{fmtTarget(lo)}°</i></div>
        <div className="cw-rb-at cw-rb-at--hi"><i className="cw-rb-k cw-rb-k--hi">{fmtTarget(hi)}°</i></div>
      </div>
      {/* Pointer: tap or drag anywhere on the bar. Keyboard and screen readers: the two sliders below. */}
      <div className="cw-rb-hit" {...range.hitProps} />
      <input id={`${id}-lo`} className="cw-rb-in cw-rb-in--lo" aria-label={`${name}, heat below`} {...range.lowInputProps} />
      <input id={`${id}-hi`} className="cw-rb-in cw-rb-in--hi" aria-label={`${name}, cool above`} {...range.highInputProps} />
      {onOpen && (
        <button type="button" className="cw-rb-open" onClick={onOpen}
          aria-label={`${name}: heat below ${fmtTarget(lo)}°, cool above ${fmtTarget(hi)}°. Open details`} />
      )}
    </div>
  );
}

const Minus = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8" /></svg>;
const Plus = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7 3v8" /></svg>;

/** Sheet only: exact half-degree steps for each threshold, keeping low <= high. */
export function RangeFine({ low, high, min, max, step, onChange }: {
  low: number; high: number; min: number; max: number; step: number;
  onChange: (low: number, high: number) => void;
}) {
  const r = (v: number) => +v.toFixed(2);
  const group = (kind: "heat" | "cool", label: string, value: number, down: number, up: number, set: (v: number) => void) => (
    <div className={`cw-fine-g cw-fine-g--${kind}`} role="group" aria-label={label}>
      <span className="cw-fine-l"><span>{label}</span><b>{fmtTarget(value)}°</b></span>
      <button type="button" className="cw-fine-b" aria-label={`${label} ${fmtTarget(down)}°`} disabled={down === value} onClick={() => set(down)}><Minus /></button>
      <button type="button" className="cw-fine-b" aria-label={`${label} ${fmtTarget(up)}°`} disabled={up === value} onClick={() => set(up)}><Plus /></button>
    </div>
  );
  return (
    <div className="cw-fine">
      {group("heat", "Heat below", low, r(Math.max(min, low - step)), r(Math.min(high, low + step)), (v) => onChange(v, high))}
      {group("cool", "Cool above", high, r(Math.max(low, high - step)), r(Math.min(max, high + step)), (v) => onChange(low, v))}
    </div>
  );
}
