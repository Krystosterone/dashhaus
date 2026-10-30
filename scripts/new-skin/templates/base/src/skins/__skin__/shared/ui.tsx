import { useState } from "react";
import type { ReactNode } from "react";
import { usePress } from "../../../primitives/press";
import { useSheet } from "../../../primitives/sheet";
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

export interface __Skin__CardFrameProps {
  name: string;
  area?: string;
  state: string;
  summary: ReactNode;
  icon?: ReactNode;
  footprint?: __Skin__Footprint;
  actions?: ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Neutral Card frame for a generated skin: fixed footprints, explicit unavailable state, and a native details dialog.
 * Replace its visual language, not its entity or Home Assistant contracts, when giving the skin its own design.
 */
export function __Skin__CardFrame({ name, area, state, summary, icon, footprint = "standard", actions, children, defaultOpen = false }: __Skin__CardFrameProps) {
  const [open, setOpen] = useState(defaultOpen);
  const sheet = useSheet({
    open,
    label: `${name} details`,
    onClose: () => setOpen(false),
    closeMs: 240,
    phone: "(max-width: 600px)",
    handle: ".__skin__-dialog-head",
    snapBack: "translate 220ms var(--__skin__-ease-out)",
  });
  const unavailable = state === "unavailable";
  return (
    <>
      <article className="__skin__-card" data-footprint={footprint} data-state={state}>
        <div className="__skin__-identity" aria-hidden="true">{icon ?? name.slice(0, 1).toUpperCase()}</div>
        <div className="__skin__-copy">
          <button type="button" className="__skin__-title" onClick={() => setOpen(true)}>{name}</button>
          <p className="__skin__-area">{area ?? "No area"}</p>
          <p className="__skin__-state">{unavailable ? "Unavailable" : state.replace(/[_-]+/g, " ")}</p>
        </div>
        <p className="__skin__-summary">{unavailable ? "—" : summary}</p>
        {actions && <div className="__skin__-actions">{actions}</div>}
      </article>
      {sheet.mounted && (
        <dialog {...sheet.dialogProps} className="__skin__-dialog">
          <div className="__skin__-dialog-head">
            <div><strong>{name}</strong>{area && <span>{area}</span>}</div>
            <button type="button" data-autofocus onClick={() => setOpen(false)} aria-label={`Close ${name} details`}>Close</button>
          </div>
          <div className="__skin__-dialog-body">
            <p className="__skin__-dialog-state">{unavailable ? "Unavailable" : state.replace(/[_-]+/g, " ")}</p>
            {children ?? <p>This neutral detail surface is ready for the Card's domain-specific design.</p>}
          </div>
        </dialog>
      )}
    </>
  );
}
