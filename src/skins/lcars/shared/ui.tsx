import type { ReactNode } from "react";
import { usePress } from "@dashhaus/core/primitives";
import { CardDialog, detailsSheet, detailsTile, useCardFrame } from "@dashhaus/dashboard/card";
import type { CardProps, CardSheetProps, TileProps } from "@dashhaus/dashboard/card";
import "./ui.css";

export type LcarsFootprint = "compact" | "standard";

export interface LcarsActionProps {
  label: string;
  onPress: () => void;
  pressed?: boolean;
  unavailable?: boolean;
}

/** The generated baseline's latching or one-shot action, on the shared press primitive. */
export function LcarsAction({ label, onPress, pressed, unavailable }: LcarsActionProps) {
  const press = usePress({ onPress, pressed, unavailable });
  return <button {...press} className="lcars-action">{label}</button>;
}

/** One Card's props: its entity's facts, and the frame's card props. */
export interface LcarsCardProps extends Omit<CardProps, "footprint"> {
  /** Which card this is (its folder's name, e.g. `light`), on the article as `data-card` for styling and tests. */
  card?: string;
  name: string;
  area?: string;
  state: string;
  summary: ReactNode;
  icon?: ReactNode;
  footprint?: LcarsFootprint;
  actions?: ReactNode;
  /** A readout drawn on the card's face under its name (a level meter, a second reading). Same height in every state. */
  extra?: ReactNode;
  children?: ReactNode;
}

/** What a generated Card takes: the Card plus its details, opened from its name. */
export type LcarsCardFrameProps = TileProps<LcarsCardProps>;

/** A stable LCARS-style panel number for a card ("04-221"), from its name: decoration, hidden from readers. */
export function lcarsCode(seed: string) {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `${String(hash % 100).padStart(2, "0")}-${String((hash >>> 8) % 1000).padStart(3, "0")}`;
}

const words = (state: string) => state.replace(/[_-]+/g, " ");

/**
 * The Card as it sits on the dashboard, or as the dialog's body while it is in its sheet. The frame names the article
 * after the Card's title (`frame.article` points at `frame.nameId`), and the title says it opens a dialog.
 *
 * On the dashboard it is an LCARS bracket: a coloured rail down the left, turning into a bar along the top and
 * bottom, with the area cut into the top bar and a panel number on the rail. The rail's colour follows the state.
 */
function LcarsCard({ card, name, area, state, summary, footprint, actions, extra, children, variant, onOpenDetails, onClose }: LcarsCardProps) {
  const frame = useCardFrame({ variant, footprint });
  const unavailable = state === "unavailable";
  if (frame.sheet) {
    return (
      <>
        <div className="lcars-dialog-head">
          <div className="lcars-dialog-name"><strong>{name}</strong><span>{area ?? "No area"}</span></div>
          <button type="button" data-autofocus onClick={onClose} aria-label={`Close ${name} details`}>Close</button>
        </div>
        <div className="lcars-dialog-body">
          <p className="lcars-dialog-state">{unavailable ? "Unavailable" : words(state)}</p>
          {children}
        </div>
      </>
    );
  }
  return (
    <article {...frame.article} className="lcars-card" data-card={card} data-footprint={frame.footprint} data-state={state}>
      <span className="lcars-card-code" aria-hidden="true">{lcarsCode(name)}</span>
      <span className="lcars-card-tag" aria-hidden="true">{area ?? "No area"}</span>
      <div className="lcars-card-panel">
        <div className="lcars-copy">
          <button type="button" id={frame.nameId} className="lcars-title" aria-haspopup="dialog" onClick={onOpenDetails}>{name}</button>
          <p className="lcars-area">{area ?? "No area"}</p>
          <p className="lcars-state">{unavailable ? "Unavailable" : words(state)}</p>
        </div>
        <p className="lcars-summary">{unavailable ? "—" : summary}</p>
        {extra && <div className="lcars-extra">{extra}</div>}
        {actions && <div className="lcars-actions">{actions}</div>}
      </div>
    </article>
  );
}

/** The generated skin's details wrapper: the frame's native dialog and the Card's sheet view inside it. */
function LcarsSheet({ open, onClose, label, children }: CardSheetProps) {
  return (
    <CardDialog open={open} onClose={onClose} label={label} className="lcars-dialog" handle=".lcars-dialog-head" closeMs={240} snapBack="translate 220ms var(--lcars-ease-out)">
      {children}
    </CardDialog>
  );
}

const LcarsDetails = detailsSheet(LcarsCard, LcarsSheet, (props) => `${props.name} details`);

/**
 * Neutral Card frame for a generated skin: fixed footprints, explicit unavailable state, and a native details dialog.
 * Replace its visual language, not its entity or Home Assistant contracts, when giving the skin its own design.
 */
export const LcarsCardFrame = detailsTile(LcarsCard, LcarsDetails);
