import { usePicture } from "@dashhaus/core/hooks";
import type { CameraEntity } from "@dashhaus/core/entities/camera/types";
import { cameraKind, cameraWord, STILL_REFRESH, stillNote } from "@dashhaus/core/entities/camera/words";
import { lastChangedFact, lastSeenFact } from "@dashhaus/core/entities/facts";
import { CameraIcon } from "./icons";
import { CardFrame, Picture, Readout, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./CameraCard.css";

export interface CameraCardProps extends CardProps {
  entity: CameraEntity;
  /**
   * False: no still at all, for privacy or cost (YAML `still: false`, or the dashboard's `stills: false`). The card
   * shows its state and glyph, and nothing is requested. Default true.
   */
  still?: boolean;
  /** How often the still refreshes while it is seen, in seconds. Default 10. */
  refresh?: number;
  /**
   * Hold the still instead of refreshing it (a `quiet` dashboard): it loads when it comes on screen and when the panel
   * wakes, and the card says when it is from.
   */
  paused?: boolean;
  /**
   * Open the live stream: inside Home Assistant, its more-info dialog (`useHaMoreInfo`). The still and the name open
   * it; without one (a story, a standalone app) they open the details, with the still large and refreshing.
   */
  onOpenLive?: () => void;
  /** Card only: the reading opens the details sheet; the name and the still do too, where there is no stream to open. */
  onOpenDetails?: () => void;
}

/**
 * One camera (`camera.*`), a doorbell or a nursery's: a reading, its state and its still. A bare camera in place of an
 * orb, saying its state without colour (a dot while it records, waves while it streams), its state in words, and its
 * still in a neutral well (`Picture`): beside the words on a standard card, across a featured card at 16:9, whole in
 * the sheet, never in a compact row. The still loads only while it is seen and refreshes only then (`usePicture`); it
 * never glows and never carries the state. While the camera is unavailable no frame is drawn, only the dashed well;
 * a still that isn't refreshing says when it is from, and one with nothing to show says No picture, on the status line.
 * The name and the still open the live stream where the host has one (Home Assistant's more-info), else the sheet; the
 * reading always opens the sheet, so it stays in reach inside Home Assistant.
 */
export function CameraCard({ entity: e, still = true, refresh = STILL_REFRESH, paused = false, variant, footprint, showControl, onOpenLive, onOpenDetails, onClose }: CameraCardProps) {
  const card = useCard("cm", { variant, footprint, showControl, area: e.area });
  const { sheet, compact, area } = card;
  const unav = e.state === "unavailable";
  const word = cameraWord(e);
  // A compact row never draws a picture, so it never asks for one; switched off, nothing is asked for anywhere.
  const drawn = still && !compact;
  const picture = usePicture<HTMLElement>(drawn && !unav ? e.picture : undefined, { refresh: refresh * 1000, paused });
  const note = drawn ? stillNote(e, picture) : undefined;
  const open = sheet ? undefined : onOpenLive ?? onOpenDetails;
  const since = !unav && e.lastChanged ? e.lastChanged : undefined;
  const status = unav ? "Unavailable" : note ?? area ?? (since && `Since ${since}`);
  const spoken = `${word}${since ? `, since ${since}` : ""}`;
  const live = !!onOpenLive;

  const bar = (
    <span className="hd-bar cm-bar">
      <span className="hd-metric cm-f">{word}</span>
      {since && (
        <span className="hd-metric hd-metric--sub cm-since">
          <span className="hd-label">Since</span>
          <span className="hd-metric-t">{since}</span>
        </span>
      )}
    </span>
  );

  // The sheet shows the whole frame; a press there opens the stream only where there is one, since the sheet is open.
  const well = drawn && (!sheet || !unav) && (
    <div className="cm-pic">
      <Picture
        picture={picture}
        label={`${e.name}: ${word}`}
        fit={sheet ? "contain" : "cover"}
        ratio={sheet ? "16 / 9" : undefined}
        unavailable={unav}
        onOpen={sheet ? onOpenLive : open}
        openLabel={live ? "Open live view" : "Open details"}
      >
        <CameraIcon state={e.state} />
      </Picture>
    </div>
  );

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, "data-still": drawn ? "" : undefined, ...paint("reading", 0) }}
      glyph={<CameraIcon state={e.state} />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={open}
      openHint={live ? "live view" : "details"}
      status={status}
      value={word}
      readout={{ value: unav ? null : word, label: sheet && !unav ? spoken : undefined }}
      onClose={onClose}
      // The sheet's header says the state; it keeps the slot only for the dashed unavailable.
      slot={!sheet || unav}
      // The reading opens the details, even where the name and the still open the stream: the sheet stays in reach.
      control={sheet || !onOpenDetails ? <Readout label={spoken}>{bar}</Readout>
        : <Readout label={`${e.name}: ${spoken}`} onOpen={onOpenDetails}>{bar}</Readout>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav ? "" : cameraKind(e) }}
    >
      {well}
    </CardFrame>
  );
}

export type CameraSheetProps = SheetProps<CameraCardProps>;

export const CameraSheet = detailsSheet(CameraCard);
