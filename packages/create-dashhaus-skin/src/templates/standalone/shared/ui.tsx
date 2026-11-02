import type { ReactNode } from "react";
import { usePress } from "@dashhaus/core/primitives";
import { CardDialog } from "@dashhaus/dashboard/card";
import type { CardSheetProps } from "@dashhaus/dashboard/card";

/** A card's action: one latching button on the shared press primitive. */
export interface ActionProps {
  label: string;
  onPress: () => void;
  pressed?: boolean;
  unavailable?: boolean;
}

export function Action({ label, onPress, pressed, unavailable }: ActionProps) {
  const press = usePress({ onPress, pressed, unavailable });
  // usePress gives the button its type, aria-pressed and aria-disabled.
  return <button className="__skin__-action" {...press}>{label}</button>;
}

export interface CardHeadProps {
  /** The id `useCardFrame` gives the article, so its name is the card's accessible name. */
  id: string;
  name: string;
  area?: string;
  /** Given by the tile: the name becomes the button that opens the details. */
  onOpen?: () => void;
}

/** A card's header: its name and its room. */
export function CardHead({ id, name, area, onOpen }: CardHeadProps) {
  return (
    <header className="__skin__-card-head">
      <h3 className="__skin__-card-name">
        {onOpen
          ? (
            <button type="button" className="__skin__-open" aria-label={`${name} details`} aria-haspopup="dialog" onClick={onOpen}>
              <span id={id}>{name}</span>
              <span className="__skin__-open-mark" aria-hidden="true">›</span>
            </button>
          )
          : <span id={id}>{name}</span>}
      </h3>
      <p className="__skin__-card-area">{area ?? "No area"}</p>
    </header>
  );
}

export interface RowProps {
  id: string;
  name: string;
  area?: string;
  reading: string;
  /** Given by the tile: the whole row, not just its name, opens the details. */
  onOpen?: () => void;
}

/** A compact card with no inline control (`showControl={false}`): its row is the details trigger. */
export function Row({ id, name, area, reading, onOpen }: RowProps) {
  const content = (
    <>
      <span className="__skin__-row-name" id={id}>{name}</span>
      <span className="__skin__-row-area">{area ?? "No area"}</span>
      <span className="__skin__-row-reading">{reading}</span>
    </>
  );
  return onOpen
    ? <button type="button" className="__skin__-row" aria-label={`${name} details`} aria-haspopup="dialog" onClick={onOpen}>{content}</button>
    : <div className="__skin__-row">{content}</div>;
}

/** One fact in a card's details, as a `dt`/`dd` pair inside the card's `dl`. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="__skin__-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * The skin's details surface: the frame's modal dialog under the skin's classes, a centred panel that becomes a
 * bottom sheet on phones (drag its header down to close). The frame owns the focus, the scroll lock, Escape and the
 * backdrop; the card in it is drawn at `variant="sheet"`.
 */
export function Sheet({ open, onClose, label, children }: CardSheetProps) {
  return (
    <CardDialog open={open} onClose={onClose} label={label} className="__skin__-sheet" handle=".__skin__-sheet-head" snapBack="transform 300ms var(--__skin__-ease-out)">
      <header className="__skin__-sheet-head">
        <h2 className="__skin__-sheet-name">{label}</h2>
        <button type="button" className="__skin__-sheet-close" aria-label="Close details" data-autofocus onClick={onClose}>Close</button>
      </header>
      {children}
    </CardDialog>
  );
}
