/**
 * The card frame, for every skin: the shape a card derives from its variant and footprint, the ids that name it,
 * its details state, and the composition of a card with its details surface. A skin supplies the markup, the
 * class names and its parts, and keeps what only it knows (orb's bundle lid, field's alert line). React only: no
 * CSS, no skin and no Home Assistant.
 */
import { createElement, useId, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useSheet } from "@scope/core/primitives";

/** Dashboard footprints. A skin whose cards don't use `featured` narrows it in its own type. */
export type CardFootprint = "compact" | "standard" | "featured";
/** "card" sits on the dashboard; "sheet" is the full view in its details surface. */
export type CardVariant = "card" | "sheet";

/** The props every card takes, whatever its entity. A card's props extend this. */
export interface CardProps {
  /** "card" sits on the dashboard; "sheet" is the full view in its details surface. */
  variant?: CardVariant;
  /** Card footprint. The skin's stylesheet sets the heights; the three names are the shared vocabulary. */
  footprint?: CardFootprint;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open the
   * details. Default true.
   */
  showControl?: boolean;
  /** Card only: the name opens the details. */
  onOpenDetails?: () => void;
  onClose?: () => void;
}

export type CardFrameOptions = Pick<CardProps, "variant" | "footprint" | "showControl">;

/** What a card derives from its variant and footprint, before any skin's markup. */
export interface CardShape {
  /** The card as its full view: no footprint, inline control or featured extras. */
  sheet: boolean;
  compact: boolean;
  featured: boolean;
  /** A compact card with its inline control hidden: the row is the details trigger. */
  bare: boolean;
  /** The normalized footprint. It means nothing in the sheet, which ignores it. */
  footprint: CardFootprint;
}

/**
 * The footprint flags every skin's card shares. The sheet ignores the footprint and the control; a bare card is
 * a compact card whose row replaces the control with the value and opens the details.
 */
export function cardShape({ variant = "card", footprint = "standard", showControl = true }: CardFrameOptions = {}): CardShape {
  const sheet = variant === "sheet";
  const compact = !sheet && footprint === "compact";
  return {
    sheet,
    compact,
    featured: !sheet && footprint === "featured",
    bare: compact && !showControl,
    footprint,
  };
}

/** A card's frame: its shape, the ids that name it, and the article's accessible name. */
export interface CardFrame extends CardShape {
  /** Stable for the card's render: build other ids from it. */
  uid: string;
  /** The card's name id: the article is labelled by it and the title carries it. */
  nameId: string;
  /** Spread onto the card's `<article>`. */
  article: { "aria-labelledby": string };
}

/**
 * The card frame for a render: the footprint flags, a `uid` for other ids, and the `nameId` that ties the article
 * to its title. A skin composes its own class names and data attributes from the flags.
 */
export function useCardFrame(options: CardFrameOptions = {}): CardFrame {
  const uid = useId();
  const nameId = `${uid}-n`;
  return { ...cardShape(options), uid, nameId, article: { "aria-labelledby": nameId } };
}

/** Whether a card's details are open, with what opens and closes them. */
export interface Details {
  open: boolean;
  openDetails: () => void;
  closeDetails: () => void;
}

/** A card's details state, open on first render with `defaultOpen` (stories). */
export function useDetails(defaultOpen = false): Details {
  const [open, setOpen] = useState(defaultOpen);
  return { open, openDetails: () => setOpen(true), closeDetails: () => setOpen(false) };
}

/** The content a skin's details wrapper renders around a card's sheet view. */
export interface CardSheetProps {
  open: boolean;
  onClose: () => void;
  /** The dialog's accessible name, e.g. "Kitchen details". */
  label: string;
  children: ReactNode;
}

export interface CardDialogProps extends CardSheetProps {
  /** The dialog's class name, from the skin's stylesheet. */
  className: string;
  /** A selector for the part that drags the dialog down on phones (its header). */
  handle: string;
  /** The transition a short drag snaps back with, e.g. "translate 300ms var(--ease-drawer)". */
  snapBack: string;
  /** The skin's longest exit transition plus a frame, in ms. */
  closeMs?: number;
  /** Where the dialog is a phone bottom sheet. */
  phone?: string;
}

/**
 * The frame's details dialog: a native modal `<dialog>` whose content mounts while it is open (and while it
 * animates out), on `useSheet`'s behaviour. The skin draws the content and names its classes; the frame owns the
 * element, the label, the focus, the scroll lock, Escape and the backdrop close. It stays a native dialog, never
 * a portalled one, so it also works inside a Lovelace card's shadow root.
 */
export function CardDialog({ open, onClose, label, className, handle, snapBack, closeMs = 250, phone = "(max-width: 600px)", children }: CardDialogProps) {
  const { mounted, dialogProps } = useSheet({ open, label, onClose, closeMs, phone, handle, snapBack });
  return <dialog className={className} {...dialogProps}>{mounted && children}</dialog>;
}

/** A card's sheet props: everything but the card-only ones, plus whether it is open. */
export type SheetProps<P> = Omit<P, "variant" | "footprint" | "onOpenDetails" | "onClose"> & { open: boolean; onClose: () => void };
/** A card's tile props: the card's, with the sheet wired in. */
export type TileProps<P> = Omit<P, "variant" | "onOpenDetails" | "onClose"> & { defaultOpen?: boolean };

/**
 * The details sheet for a card: the card itself as `variant="sheet"`, inside the skin's `Sheet`. `label` names the
 * dialog from the card's own props, so a card's sheet keeps the name the tile had.
 */
export function detailsSheet<P extends CardProps>(Card: ComponentType<P>, Sheet: ComponentType<CardSheetProps>, label: (props: P) => string) {
  function DetailsSheet({ open, onClose, ...props }: SheetProps<P>) {
    const p = { ...props, variant: "sheet", onClose } as unknown as P;
    return <Sheet open={open} onClose={onClose} label={label(p)}>{createElement(Card, p)}</Sheet>;
  }
  DetailsSheet.displayName = `${(Card.displayName ?? Card.name).replace(/Card$/, "")}Sheet`;
  return DetailsSheet;
}

/**
 * A dashboard-ready tile for a card: the card, in `className` when the skin sizes cards from their container, plus
 * its details sheet. The tile owns the details' open state and hands the card `onOpenDetails` and the sheet
 * `open` and `onClose`.
 */
export function detailsTile<P extends CardProps>(Card: ComponentType<P>, DetailsSheet: ComponentType<SheetProps<P>>, className?: string) {
  function Tile({ defaultOpen = false, ...props }: TileProps<P>) {
    const [open, setOpen] = useState(defaultOpen);
    const card = createElement(Card, { ...props, onOpenDetails: () => setOpen(true) } as unknown as P);
    return (
      <>
        {className ? <div className={className}>{card}</div> : card}
        {createElement(DetailsSheet, { ...props, open, onClose: () => setOpen(false) } as unknown as SheetProps<P>)}
      </>
    );
  }
  Tile.displayName = `${(Card.displayName ?? Card.name).replace(/Card$/, "")}Tile`;
  return Tile;
}
