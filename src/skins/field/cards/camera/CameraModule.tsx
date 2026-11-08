import type { ReactNode } from "react";
import { usePicture } from "@dashhaus/core/hooks";
import type { CameraEntity, CameraState } from "@dashhaus/core/entities/camera/types";
import { cameraKind, cameraWord, liveViewSaid, openStillWord, STILL_REFRESH, stillNote } from "@dashhaus/core/entities/camera/words";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { Blank, Glyph, Key, KeyGroup, ModuleFrame, Pictogram, Picture, Screen, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { CAMERA_PICT, IconCamera } from "./icons";
import "./CameraModule.css";

export interface CameraModuleProps {
  entity: CameraEntity;
  footprint?: FieldFootprint;
  /**
   * False: no still at all, for privacy or cost (YAML `still: false`, or the dashboard's `stills: false`). The module
   * shows its state on its screen, and nothing is requested. Default true.
   */
  still?: boolean;
  /** How often the still refreshes while it is seen, in seconds. Default 10. */
  refresh?: number;
  /** Hold the still instead of refreshing it (a `quiet` dashboard); the screen says when it is from. */
  paused?: boolean;
  /**
   * Open the live stream: inside Home Assistant, its more-info dialog (`useHaMoreInfo`). The still opens it, and the
   * panel carries a Live key to it; without one (a story, a standalone app) the still opens the panel, with the still
   * large and refreshing.
   */
  onOpenLive?: () => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/**
 * The screen's figure, at four places like a segment display's: `IDLE` in the dim ink (a resting state, never blank),
 * `REC` while it records, `LIVE` while it streams. A state Home Assistant doesn't name is blank segments, the meta line
 * saying it in words.
 */
const FIGURE: Partial<Record<CameraState, string>> = { idle: "IDLE", recording: "REC", streaming: "LIVE" };

/**
 * One camera (a doorbell, a nursery's) as a field module: a reading, its state and its still. Its body is the screen,
 * the still a window in it (`Picture`) beside the screen's words: the state at four places (`IDLE`, `REC`, `LIVE`)
 * beside the camera's pictogram, lit while it records or streams, then the state in words and since when, or how old
 * the still is (`Still from 22:14`, `No picture`). The still loads and refreshes only while it is seen; it never
 * inverts and carries no colour of Field's. A row has no picture: glyph, name and area, screen. The panel shows the
 * whole still at its width, the screen under it. The name opens the panel, as on every module; the still opens the live
 * stream where the host has one (Home Assistant's more-info), else the panel, and the panel carries a Live key to the
 * stream, so it stays in reach with stills off.
 */
export function CameraModule({ entity: e, footprint = "standard", still = true, refresh = STILL_REFRESH, paused = false, onOpenLive, defaultOpen = false }: CameraModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const compact = footprint === "compact";
  const word = cameraWord(e);
  // A row never draws a picture, so it never asks for one; switched off, nothing is asked for anywhere.
  const drawn = still && !compact;
  const picture = usePicture<HTMLElement>(drawn && !unav ? e.picture : undefined, { refresh: refresh * 1000, paused });
  // The panel's still is its own: it loads once the panel opens and refreshes while it stays open.
  const panelPicture = usePicture<HTMLElement>(still && details.open && !unav ? e.picture : undefined, { refresh: refresh * 1000, paused });
  const note = drawn ? stillNote(e, picture) : undefined;
  const panelNote = still ? stillNote(e, panelPicture) : undefined;
  // The still opens the stream where there is one; the name, as on every module, opens the panel.
  const open = onOpenLive ?? details.openDetails;
  const openLabel = openStillWord(!!onOpenLive);
  const lit = e.state === "recording" || e.state === "streaming";

  const pict = <Pictogram param="neutral" lit={lit}>{CAMERA_PICT}</Pictogram>;
  const figure = FIGURE[e.state];
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : figure ? <><span aria-hidden="true">{figure}</span><span className="fd-sr">{word}</span></>
    : <Blank places={4} label={word} />;
  const since = sinceFact(e.lastChanged);
  // Unavailable says when it was last seen in core's words ("Last seen 08:20"), as every module does.
  const metaOf = (said?: string): [ReactNode, ReactNode?] => unav ? [word, e.lastSeen ? lastSeenFact(e.lastSeen) : undefined] : [word, said ?? since];
  const glyph = <Glyph unavailable={unav}><IconCamera state={e.state} /></Glyph>;
  const label = `${e.name}: ${word}`;

  const body = (
    <div className="fd-cm-body" data-still={drawn || undefined}>
      {drawn && (
        <Picture picture={picture} label={label} unavailable={unav} onOpen={open} openLabel={openLabel}>
          <svg viewBox="0 0 20 26" aria-hidden="true">{CAMERA_PICT}</svg>
        </Picture>
      )}
      <Screen pict={pict} meta={metaOf(note)}>{read}</Screen>
    </div>
  );

  return (
    <ModuleFrame
      kind="fd-cm"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      details={details}
      pict={pict}
      read={read}
      meta={metaOf(note)}
      lead={glyph}
      body={body}
      panelScreen={{ pict, read, meta: metaOf(panelNote) }}
      panelPicture={still && !unav && (
        <Picture picture={panelPicture} label={label} fit="contain" onOpen={onOpenLive} openLabel={openStillWord(true)}>
          <svg viewBox="0 0 20 26" aria-hidden="true">{CAMERA_PICT}</svg>
        </Picture>
      )}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav ? "" : cameraKind(e) }}
    >
      {onOpenLive && !unav && (
        <KeyGroup legend="Camera" columns={1}>
          <Key label={liveViewSaid(e.name)} wide caption="Live" onPress={onOpenLive}><IconCamera state="streaming" /></Key>
        </KeyGroup>
      )}
    </ModuleFrame>
  );
}
