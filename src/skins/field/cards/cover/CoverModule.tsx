import { useId } from "react";
import type { ReactNode } from "react";
import type { CoverEntity, CoverHistory } from "../../../../domains/cover/types";
import { CLASS_LABEL, QUICK_POSITIONS, hasPosition, isAccess, isMoving, openness, snapEnds } from "../../../../domains/cover/position";
import { Blank, Digits, Fader, Key, Legend, ModuleFrame, Pictogram, Screen, Today, Warn, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconCover, IconDown, IconStop, IconUp, SLATS, WINDOW } from "./icons";
import "./CoverModule.css";

export interface CoverModuleProps {
  entity: CoverEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave the panel without it. */
  history?: CoverHistory;
  onOpenCover: () => void;
  onCloseCover: () => void;
  onStopCover: () => void;
  /** Move it to a position, 0 closed to 100 open. Omit, or a cover without a position, and there is no fader. */
  onSetPosition?: (position: number) => void;
  /** Tilt a blind's slats, 0 to 100. Omit, or a cover without tilt, and the panel has no slats fader. */
  onSetTilt?: (tilt: number) => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** A pointer value onto whole percent, with magnetic ends: a tap near an end closes or opens it fully. */
const snap = (raw: number) => snapEnds(Math.round(raw));

/** A position in words, for screen readers and the quick keys. */
const positionText = (v: number) => (v === 0 ? "Closed" : v === 100 ? "Open" : v === 50 ? "Half open" : `${v}% open`);

/** A percentage in its three fixed places: the leading digits unlit, read as the bare number. */
const Percent = ({ value }: { value: number }) => <><Digits value={value} /><small>%</small></>;

/**
 * One cover (curtains, blinds, shades, a garage door) as a field module. Position follows Home Assistant: 0 closed,
 * 100 open. The key closes it while it's open and opens it while it's closed, and stops it on the way; its LED says
 * it's open. The screen leads with how open it is beside a window lit from the bottom, in the position's colour, the
 * fader thumb's; a cover with no position says OPEN or SHUT. A garage door, door or gate left open is a warning on
 * the screen. The name, or a press and hold on the key, opens the detail panel: quick positions, slats, today.
 */
export function CoverModule({ entity: e, footprint = "standard", history, onOpenCover, onCloseCover, onStopCover, onSetPosition, onSetTilt, defaultOpen = false }: CoverModuleProps) {
  const uid = useId();
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const moving = isMoving(e);
  const pos = Math.round(openness(e));
  const open = !unav && (pos > 0 || e.state === "open");
  const withPos = hasPosition(e);
  const settable = withPos && onSetPosition != null && !unav;
  const stopping = moving && e.supportsStop;
  const travel = e.state === "opening" ? "Opening" : "Closing";
  const word = moving ? travel : open ? "Open" : "Closed";
  // A door left open is about what it reads, so it stays on the screen; a row has no meta lines, so it takes the area's.
  const warned = isAccess(e.deviceClass) && open && !moving;
  const warning = warned ? `Open${e.lastChanged ? ` since ${e.lastChanged}` : ""}` : undefined;

  // The window lights with the daylight let in, from the bottom; a cover with no position sets nothing, so it is neutral.
  const pict = <Pictogram level={pos / 100} lit={open} param={withPos ? "a" : "neutral"}>{WINDOW}</Pictogram>;
  // On the way, a cover with no position is neither open nor shut: its figure is blank, and the meta line says where it's going.
  const read: ReactNode = unav ? <Blank label="Unavailable" />
    : withPos ? <Percent value={pos} />
    : moving ? <Blank places={4} label={travel} />
    : open ? "OPEN" : "SHUT";
  const since = !moving && e.lastChanged ? `Since ${e.lastChanged}` : undefined;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : undefined]
    : warning ? [<Warn key="w">{warning}</Warn>]
    : [word, since];

  const openPanel = details.openDetails;
  const press = stopping ? onStopCover : open ? onCloseCover : onOpenCover;
  const key = (wide: boolean) => (
    <Key label={stopping ? `Stop ${e.name}` : e.name} pressed={open} disabled={unav} onPress={press} onHold={openPanel} wide={wide} caption={wide && !unav ? (stopping ? "Stop" : word) : undefined}>
      {stopping ? <IconStop /> : <IconCover kind={e.deviceClass} open={open} />}
    </Key>
  );
  // The key and the position fader, the same in the module and the panel. Without a position to set, the key spans the row with its state.
  const controls = (where: string) => (
    <div className="fd-cv-row" data-settable={settable}>
      {key(!settable)}
      {settable && (
        <Fader
          id={`${uid}-${where}`}
          label={`${e.name} position`}
          legend={moving ? travel : "Position"}
          value={pos}
          min={0}
          max={100}
          lit={open}
          valueText={positionText(pos)}
          snap={snap}
          onChange={onSetPosition}
        />
      )}
    </div>
  );

  return (
    <ModuleFrame
      kind="fd-cv"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      warning={footprint === "compact" ? warning : undefined}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={key(false)}
      row={controls("m")}
    >
      <CoverDetails
        e={e}
        read={read}
        pict={pict}
        meta={meta}
        controls={controls("p")}
        history={history}
        onOpenCover={onOpenCover}
        onCloseCover={onCloseCover}
        onStopCover={onStopCover}
        onSetPosition={settable ? onSetPosition : undefined}
        onSetTilt={onSetTilt}
      />
    </ModuleFrame>
  );
}

interface DetailsProps extends Pick<CoverModuleProps, "onOpenCover" | "onCloseCover" | "onStopCover" | "onSetPosition" | "onSetTilt"> {
  e: CoverEntity;
  read: ReactNode;
  pict: ReactNode;
  meta: [ReactNode, ReactNode?];
  controls: ReactNode;
  history?: CoverHistory;
}

/**
 * The panel's content: the screen, with a blind's slats on its second channel; the controls; quick positions, or
 * close, stop and open for a cover with no position; the slats fader; today; and facts.
 */
function CoverDetails({ e, read, pict, meta, controls, history, onOpenCover, onCloseCover, onStopCover, onSetPosition, onSetTilt }: DetailsProps) {
  const uid = useId();
  const unav = e.state === "unavailable";
  const moving = isMoving(e);
  const pos = Math.round(openness(e));
  const open = !unav && (pos > 0 || e.state === "open");
  const withPos = hasPosition(e);
  const tilt = !unav && e.supportsTilt && e.tilt != null ? Math.round(e.tilt) : undefined;
  const today = history && (unav ? "Unavailable" : e.lastChanged ? `${open ? "Open" : "Closed"} since ${e.lastChanged}` : undefined);

  const aside = tilt != null ? (
    <p className="fd-chan">
      <Pictogram lit param="b">{SLATS}</Pictogram>
      <span><Percent value={tilt} /><span className="fd-chan-sub">Slats</span></span>
    </p>
  ) : undefined;

  return (
    <div className="fd-cv-panel" data-state={e.state}>
      <Screen pict={pict} meta={meta} aside={aside}>{read}</Screen>
      {controls}

      {onSetPosition && (
        <div className="fd-block">
          <Legend id={`${uid}-q`}>Quick positions</Legend>
          <div className="fd-cv-keys" role="group" aria-labelledby={`${uid}-q`}>
            {QUICK_POSITIONS.map((q) => <Key key={q.value} label={positionText(q.value)} wide caption={q.label} chosen={!moving && q.value === pos} onPress={() => onSetPosition(q.value)}>{null}</Key>)}
          </div>
        </div>
      )}

      {/* A cover with no position: explicit transport, each key acting once; the one that can't act lies flat. */}
      {!unav && !withPos && (
        <div className="fd-block">
          <Legend id={`${uid}-mv`}>Move</Legend>
          <div className="fd-cv-keys" data-transport role="group" aria-labelledby={`${uid}-mv`}>
            <Key label={`${e.name}, close`} wide caption="Close" disabled={!open && !moving} onPress={onCloseCover}><IconDown /></Key>
            {e.supportsStop && <Key label={`${e.name}, stop`} wide caption="Stop" disabled={!moving} onPress={onStopCover}><IconStop /></Key>}
            <Key label={`${e.name}, open`} wide caption="Open" disabled={open && !moving} onPress={onOpenCover}><IconUp /></Key>
          </div>
        </div>
      )}

      {tilt != null && onSetTilt && (
        <Fader
          id={`${uid}-t`}
          label={`${e.name} slats`}
          legend="Slats"
          value={tilt}
          min={0}
          max={100}
          lit
          param="b"
          valueText={`${tilt} percent open`}
          onChange={onSetTilt}
        />
      )}

      {history && <Today summary={today} label="Open by hour today." tone={withPos ? "a" : "neutral"} samples={history.samples} currentHour={history.currentHour} />}

      <p className="fd-info">
        <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastChanged ? `Last changed ${e.lastChanged}` : ""}</span>
        {/* Unavailable, what it can do isn't known, so only its kind is printed. */}
        <span>{unav ? CLASS_LABEL[e.deviceClass] : `${CLASS_LABEL[e.deviceClass]} · ${[withPos ? "position" : "open / close", e.supportsTilt ? "tilt" : null].filter(Boolean).join(", ")}`}</span>
      </p>
    </div>
  );
}
