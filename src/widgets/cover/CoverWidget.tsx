import { useId } from "react";
import type { CoverEntity, CoverHistory, CoverClass } from "./types";
import { CoverIcon } from "./icons";
import { PositionBar, OpenCloseControl } from "./parts";
import { Orb, CircleButton, IconOpen, IconClose, AlertStatus, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, paint } from "../../shared/ui";
import type { ColorProp, WidgetFootprint } from "../../shared/ui";
import "./CoverWidget.css";

const CLASS_LABEL: Record<CoverClass, string> = {
  curtain: "Curtain", blind: "Blind", shade: "Shade", shutter: "Shutter", awning: "Awning", window: "Window", garage: "Garage door", door: "Door", gate: "Gate",
};
/** Covers that let a person in, rather than light: open is a state (charcoal), and reads as a warning. */
const ACCESS = new Set<CoverClass>(["garage", "door", "gate"]);

const QUICK = [
  { value: 0, label: "Closed" },
  { value: 25, label: "25%" },
  { value: 50, label: "Half" },
  { value: 100, label: "Open" },
];
const SLATS = [
  { value: 0, label: "Closed" },
  { value: 50, label: "Angled" },
  { value: 100, label: "Open" },
];

export interface CoverWidgetProps {
  entity: CoverEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: CoverHistory;
  variant?: "card" | "sheet";
  /** Shared card footprint. */
  footprint?: WidgetFootprint;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. The orb keeps its tap and hold actions. Default true.
   */
  showControl?: boolean;
  onOpenCover: () => void;
  onCloseCover: () => void;
  onStopCover: () => void;
  onSetPosition?: (position: number) => void;
  onSetTilt?: (tilt: number) => void;
  /** Card only: the arrow, and press and hold on the orb, open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** The orb's colour, if any. Default: none (a neutral badge). */
  color?: ColorProp;
}

/**
 * One cover: curtains, blinds, shades, garage doors. Position follows Home Assistant: 0 closed, 100 open.
 * It shares the modular footprint matrix with every dashboard widget.
 */
export function CoverWidget({ entity: e, history, variant = "card", footprint = "standard", showControl = true, onOpenCover, onCloseCover, onStopCover, onSetPosition, onSetTilt, onOpenDetails, onClose, color }: CoverWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const compact = !sheet && footprint === "compact";
  const featured = !sheet && footprint === "featured";
  const bare = compact && !showControl;
  const unav = e.state === "unavailable";
  const moving = e.state === "opening" || e.state === "closing";
  const pos = e.position ?? (e.state === "open" || e.state === "opening" ? 100 : 0);
  const open = pos > 0 || e.state === "open";
  const access = ACCESS.has(e.deviceClass);
  // Glow is energy flowing: daylight coming in through an open curtain. A garage door lets in no light worth showing.
  const colors = paint(access ? "state" : "energy", unav || access ? 0 : (0.6 * pos) / 100, null, color);

  const withPos = e.supportsPosition && e.position != null;
  const text = moving
    ? `${e.state === "opening" ? "Opening" : "Closing"}${withPos ? ` · ${pos}%` : ""}`
    : !open ? "Closed" : !withPos || pos === 100 ? "Open" : `Open · ${pos}%`;
  const stopping = moving && e.supportsStop;
  const orbAction = stopping ? onStopCover : open ? onCloseCover : onOpenCover;
  const orbLabel = stopping ? `Stop ${e.name}` : e.name;
  const warnedOpen = access && open && !moving;
  const identity = e.area ?? CLASS_LABEL[e.deviceClass];
  const alertLabel = warnedOpen ? `Warning: ${e.name} has been open${e.lastChanged ? ` since ${e.lastChanged}` : ""}` : undefined;

  // A door left open leads the status line in the warn colour, like a sensor's low battery.
  const status = unav ? "Not responding"
    : warnedOpen ? (compact ? identity : `Open${e.lastChanged ? ` since ${e.lastChanged}` : ""}`)
    : identity;
  const areaText = sheet && e.area && !(access && open) ? `${e.area} · ${CLASS_LABEL[e.deviceClass]}` : status;

  let slot;
  if (unav) slot = <UnavailableSlot lastSeen={e.lastSeen} />;
  else if (withPos && onSetPosition) {
    slot = <PositionBar id={`${uid}-p`} label={`${e.name} position`} kind={e.deviceClass === "curtain" ? "curtain" : "shade"} position={pos} moving={moving} text={text} onChange={onSetPosition} />;
  } else {
    slot = <OpenCloseControl name={e.name} open={open} moving={moving} text={text} canStop={e.supportsStop} onOpen={onOpenCover} onClose={onCloseCover} onStop={onStopCover} />;
  }

  // The compact value appears under the name, or in place of a hidden control.
  const subText = unav ? "Unavailable" : text;
  return (
    <article className={`hd cv${sheet ? " hd--sheet" : ""}${compact ? " hd--compact" : ""}${featured ? " hd--featured" : ""}`} data-control={bare ? "off" : undefined} data-state={e.state} data-alert={warnedOpen ? "warn" : undefined} {...colors} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <Orb label={orbLabel} pressed={open && !unav} unavailable={unav} intensity={pos / 100} onToggle={orbAction} onLongPress={sheet ? undefined : onOpenDetails}>
          <CoverIcon kind={e.deviceClass} open={open} stop={stopping} />
        </Orb>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area">{alertLabel ? <AlertStatus label={alertLabel}>{areaText}</AlertStatus> : areaText}</p>
          {compact && <p className="hd-sub">{alertLabel ? <AlertStatus label={alertLabel}>{subText}</AlertStatus> : subText}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{unav ? null : withPos && pos > 0 ? <>{pos}<span>%</span></> : open ? "Open" : "Closed"}</p>
        {sheet
          ? <CircleButton
            label={`Close ${e.name} details`}
            onClick={onClose}
            // Focus lands on the sheet's close button when it opens: dialog focus management, not page-load focus theft.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          ><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
      </header>

      <div className="hd-slot">{bare ? <p className="hd-val">{subText}</p> : slot}</div>

      {sheet && !unav && (withPos || e.supportsTilt) && (
        <div className="hd-extra">
          {withPos && onSetPosition && <ChoiceChips id={`${uid}-q`} label="Quick positions" options={QUICK} value={moving ? null : pos} onChange={onSetPosition} />}
          {e.supportsTilt && e.tilt != null && onSetTilt && <ChoiceChips id={`${uid}-t`} label="Slats" options={SLATS} value={e.tilt} onChange={onSetTilt} />}
        </div>
      )}

      {history && (
        <TodayStrip
          samples={history.samples}
          currentHour={history.currentHour}
          summary={unav ? `Unreachable since ${e.lastSeen ?? "earlier"}` : e.lastChanged ? `${open ? "Open" : "Closed"} since ${e.lastChanged}` : ""}
        />
      )}

      {sheet && (
        <p className="hd-info">
          <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastChanged ? `Last changed ${e.lastChanged}` : ""}</span>
          <span>{[CLASS_LABEL[e.deviceClass], withPos ? "position" : "open / close", e.supportsTilt ? "tilt" : null].filter(Boolean).join(", ")}</span>
        </p>
      )}
    </article>
  );
}

export interface CoverSheetProps extends Omit<CoverWidgetProps, "variant" | "footprint" | "onOpenDetails" | "onClose"> {
  open: boolean;
  onClose: () => void;
}

export function CoverSheet({ open, onClose, ...props }: CoverSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label={`${props.entity.name} details`}>
      <CoverWidget {...props} variant="sheet" onClose={onClose} />
    </Sheet>
  );
}
