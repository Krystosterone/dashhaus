import { useSlider } from "@dashhaus/core/primitives";

interface TrackProps {
  label: string;
  value: number;
  onChange: (percent: number) => void;
}

/**
 * A track you draw yourself: the pointer goes to a hit layer (a touch only sets a value on a tap or a sideways
 * drag, so scrolling past never changes it), and a hidden native range input carries the keyboard and screen reader.
 */
export function Track({ label, value, onChange }: TrackProps) {
  const slider = useSlider<HTMLDivElement>({
    value,
    min: 0,
    max: 100,
    step: 1,
    inset: 12,
    valueText: (percent) => `${percent} percent`,
    onChange,
  });
  return (
    <div className="track" {...slider.rootProps} style={{ touchAction: "pan-y" }}>
      <div className="track-fill" style={{ width: `${slider.fraction(slider.value) * 100}%` }} />
      <div className="track-hit" {...slider.hitProps} />
      <input className="track-input" aria-label={label} {...slider.inputProps} />
    </div>
  );
}
