import { useId } from "react";
import type { ReactNode } from "react";
import type { CoverEntity, CoverHistory } from "@dashhaus/core/entities/cover/types";
import { CLASS_LABEL, QUICK_POSITIONS, hasPosition, isAccess, isMoving, openness, snapEnds } from "@dashhaus/core/entities/cover/position";
import { LEFT_OPEN_WORD, coverWord, leftOpenText, positionText } from "@dashhaus/core/entities/cover/words";
import { coverSeverity } from "@dashhaus/core/entities/cover/severity";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { Blank, Digits, Fader, Key, ModuleFrame, Pictogram, Today, Warn, WarnWords, useDetails, KeyGroup, ModuleRow, Channel } from "../../shared/ui";
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
  // Reachable, but where it is isn't known (an RF blind, a garage door with no sensor): its screen has no reading, the
  // key opens it as Home Assistant's own toggle does, and every transport key acts.
  const unknown = e.state === "unknown";
  const moving = isMoving(e);
  const pos = Math.round(openness(e));
  const open = !unav && (pos > 0 || e.state === "open");
  const withPos = hasPosition(e);
  const settable = withPos && onSetPosition != null && !unav;
  const stopping = moving && e.supportsStop;
  const word = coverWord(e);
  // A door left open (core ranks it advisory) is about what it reads, so it stays on the screen, `Open` behind the
  // marker over since when, as a garage door's binary sensor says it; a row has no meta lines, so it takes the area's.
  const warned = coverSeverity(e) != null;
  // Its word, then since when, which gives way first (spec/cards.md → A warning's words fit a row).
  const warning = warned ? <WarnWords word={LEFT_OPEN_WORD} detail={leftOpenText(e.lastChanged).slice(LEFT_OPEN_WORD.length) || undefined} /> : undefined;

  // The window lights with the daylight let in, from the bottom; a cover with no position sets nothing, so it is neutral.
  const pict = <Pictogram level={pos / 100} lit={open} param={withPos ? "a" : "neutral"}>{WINDOW}</Pictogram>;
  // On the way, a cover with no position is neither open nor shut: its figure is blank, and the meta line says where it's going.
  const read: ReactNode = unav ? <Blank label="Unavailable" />
    : unknown ? <Blank places={4} label="Unknown" />
    : withPos ? <Percent value={pos} />
    : moving ? <Blank places={4} label={word} />
    : open ? "OPEN" : "SHUT";
  const since = !moving && sinceFact(e.lastChanged);
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : warned ? [<Warn key="w">{LEFT_OPEN_WORD}</Warn>, sinceFact(e.lastChanged)]
    : [word, since];

  const openPanel = details.openDetails;
  const press = stopping ? onStopCover : open ? onCloseCover : onOpenCover;
  // The key says what pressing it does; its LED says it's open, and the screen says where it is.
  const verb = stopping ? "Stop" : open ? "Close" : "Open";
  // A garage door, door or gate moves on a press and hold from the module, never a stray tap; a tap opens the
  // details, where its keys act at once. Stopping one is always a tap.
  const guarded = isAccess(e.deviceClass) && !stopping;
  const key = (wide: boolean, where: "m" | "p") => {
    const hold = guarded && where === "m";
    const does = hold ? `Hold to ${verb.toLowerCase()}` : verb;
    return (
      <Key
        label={unav ? `${e.name}, unavailable` : `${does} ${e.name}`}
        led={open}
        unavailable={unav}
        onPress={hold ? openPanel : press}
        onHold={hold ? press : openPanel}
        wide={wide}
        caption={wide && !unav ? does : undefined}
      >
        {stopping ? <IconStop /> : <IconCover kind={e.deviceClass} open={open} />}
      </Key>
    );
  };
  // The key and the position fader, the same in the module and the panel. Without a position to set, the key spans the row
  // with what it does. A garage door, door or gate has no fader on the module: one tap there would skip its press and hold.
  const controls = (where: "m" | "p") => {
    const fader = settable && !(isAccess(e.deviceClass) && where === "m");
    return (
    <ModuleRow className="fd-cv-row" solo={!fader}>
      {key(!fader, where)}
      {fader && (
        <Fader
          id={`${uid}-${where}`}
          label={`${e.name} position`}
          legend={moving ? word : "Position"}
          value={pos}
          min={0}
          max={100}
          lit={open}
          valueText={positionText(pos)}
          snap={snap}
          onChange={onSetPosition}
        />
      )}
    </ModuleRow>
    );
  };

  // The panel's content: the screen, with a blind's slats on its second channel; the controls; quick positions, or
  // close, stop and open for a cover with no position; the slats fader; today; and facts.
  const tilt = !unav && e.supportsTilt && e.tilt != null ? Math.round(e.tilt) : undefined;
  const today = history && (unav ? "Unavailable" : e.lastChanged ? `${moving ? (open ? "Open" : "Closed") : word} since ${e.lastChanged}` : undefined);

  const aside = tilt != null ? (
    <Channel pict={<Pictogram lit param="b">{SLATS}</Pictogram>} sub="Slats"><Percent value={tilt} /></Channel>
  ) : undefined;

  return (
    <ModuleFrame
      kind="fd-cv"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      // Closed is a reading, 0% open, so its figure keeps its places in the dim ink, as OFF does.
      rest={e.state === "closed"}
      warning={footprint === "compact" ? warning : undefined}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={key(false, "m")}
      controls={controls}
      aside={aside}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav ? CLASS_LABEL[e.deviceClass] : `${CLASS_LABEL[e.deviceClass]} · ${[withPos ? "position" : "open / close", e.supportsTilt ? "tilt" : null].filter(Boolean).join(", ")}` }}
    >
      {settable && onSetPosition && (
        <KeyGroup legend="Quick positions" columns={4} narrow={2}>
          {QUICK_POSITIONS.map((q) => <Key key={q.value} label={positionText(q.value)} wide caption={q.label} chosen={!moving && q.value === pos} onPress={() => onSetPosition(q.value)}>{null}</Key>)}
        </KeyGroup>
      )}

      {/* A cover with no position: explicit transport, each key acting once; the one that can't act lies flat. Unknown,
          any of them can, since it could be anywhere and on its way. */}
      {!unav && !withPos && (
        <KeyGroup legend="Move">
          <Key label={`${e.name}, close`} wide caption="Close" unavailable={!open && !moving && !unknown} onPress={onCloseCover}><IconDown /></Key>
          {e.supportsStop && <Key label={`${e.name}, stop`} wide caption="Stop" unavailable={!moving && !unknown} onPress={onStopCover}><IconStop /></Key>}
          <Key label={`${e.name}, open`} wide caption="Open" unavailable={open && !moving && !unknown} onPress={onOpenCover}><IconUp /></Key>
        </KeyGroup>
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

      {/* Unavailable, what it can do isn't known, so only its kind is printed. */}
    </ModuleFrame>
  );
}

