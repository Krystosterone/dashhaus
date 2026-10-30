import type { ReactNode } from "react";
import { usePress } from "@scope/core/primitives";
import { CardDialog, detailsSheet, detailsTile, useCardFrame } from "@scope/dashboard/card";
import type { CardProps, CardSheetProps, TileProps } from "@scope/dashboard/card";
import "./ui.css";

export type __Skin__Footprint = "compact" | "standard";

export interface __Skin__ActionProps {
  label: string;
  onPress: () => void;
  pressed?: boolean;
  unavailable?: boolean;
}

/** The generated baseline's latching or one-shot action, on the shared press primitive. */
export function __Skin__Action({ label, onPress, pressed, unavailable }: __Skin__ActionProps) {
  const press = usePress({ onPress, pressed, unavailable });
  return <button {...press} className="__skin__-action">{label}</button>;
}

/** One Card's props: its entity's facts, and the frame's card props. */
export interface __Skin__CardProps extends Omit<CardProps, "footprint"> {
  name: string;
  area?: string;
  state: string;
  summary: ReactNode;
  icon?: ReactNode;
  footprint?: __Skin__Footprint;
  actions?: ReactNode;
  children?: ReactNode;
}

/** What a generated Card takes: the Card plus its details, opened from its name. */
export type __Skin__CardFrameProps = TileProps<__Skin__CardProps>;

/** The Card as it sits on the dashboard, or as the dialog's body while it is in its sheet. */
function __Skin__Card({ name, area, state, summary, icon, footprint, actions, children, variant, onOpenDetails, onClose }: __Skin__CardProps) {
  const frame = useCardFrame({ variant, footprint });
  const unavailable = state === "unavailable";
  if (frame.sheet) {
    return (
      <>
        <div className="__skin__-dialog-head">
          <div><strong>{name}</strong>{area && <span>{area}</span>}</div>
          <button type="button" data-autofocus onClick={onClose} aria-label={`Close ${name} details`}>Close</button>
        </div>
        <div className="__skin__-dialog-body">
          <p className="__skin__-dialog-state">{unavailable ? "Unavailable" : state.replace(/[_-]+/g, " ")}</p>
          {children ?? <p>This neutral detail surface is ready for the Card's domain-specific design.</p>}
        </div>
      </>
    );
  }
  return (
    <article className="__skin__-card" data-footprint={frame.footprint} data-state={state}>
      <div className="__skin__-identity" aria-hidden="true">{icon ?? name.slice(0, 1).toUpperCase()}</div>
      <div className="__skin__-copy">
        <button type="button" className="__skin__-title" onClick={onOpenDetails}>{name}</button>
        <p className="__skin__-area">{area ?? "No area"}</p>
        <p className="__skin__-state">{unavailable ? "Unavailable" : state.replace(/[_-]+/g, " ")}</p>
      </div>
      <p className="__skin__-summary">{unavailable ? "—" : summary}</p>
      {actions && <div className="__skin__-actions">{actions}</div>}
    </article>
  );
}

/** The generated skin's details wrapper: the frame's native dialog and the Card's sheet view inside it. */
function __Skin__Sheet({ open, onClose, label, children }: CardSheetProps) {
  return (
    <CardDialog open={open} onClose={onClose} label={label} className="__skin__-dialog" handle=".__skin__-dialog-head" closeMs={240} snapBack="translate 220ms var(--__skin__-ease-out)">
      {children}
    </CardDialog>
  );
}

const __Skin__Details = detailsSheet(__Skin__Card, __Skin__Sheet, (props) => `${props.name} details`);

/**
 * Neutral Card frame for a generated skin: fixed footprints, explicit unavailable state, and a native details dialog.
 * Replace its visual language, not its entity or Home Assistant contracts, when giving the skin its own design.
 */
export const __Skin__CardFrame = detailsTile(__Skin__Card, __Skin__Details);
