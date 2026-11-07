/**
 * The picture lifecycle's pure half: what a picture shows as its frames load and fail, and the URL a refresh asks for.
 * `usePicture` drives it from the DOM (what is on screen, the page's visibility, the image loads).
 */

/**
 * `none`: no source (unavailable, switched off, no artwork). `loading`: a source with no frame of its own yet.
 * `ready`: its latest frame. `stale`: an older frame of the same source (the last load failed, or refreshing is
 * paused). `failed`: nothing to show.
 */
export type PictureStatus = "none" | "loading" | "ready" | "stale" | "failed";

/** One decoded frame: its URL, when it loaded (epoch ms), and the source it is a frame of. */
export interface PictureFrame {
  src: string;
  at: number;
  source: string;
}

export interface PictureModel {
  /** The source asked for now. */
  source?: string;
  /** The frame shown: the source's, or the previous source's while the new one loads. */
  frame?: PictureFrame;
  status: PictureStatus;
  /** When the latest load settled, loaded or failed: the next refresh counts from it. */
  settledAt?: number;
}

export type PictureEvent =
  | { type: "source"; source?: string }
  | { type: "loaded"; source: string; src: string; at: number }
  | { type: "failed"; source: string; at: number };

export const NO_PICTURE: PictureModel = { status: "none" };

/**
 * The next picture. A new source keeps the last frame up while its own loads; a failed load keeps a frame of the
 * same source (`stale`) but drops another source's, so the last track's cover never sits under the next track's
 * title. No source clears everything. A load that settles for a source no longer asked for changes nothing.
 */
export function pictureReducer(state: PictureModel, event: PictureEvent): PictureModel {
  switch (event.type) {
    case "source":
      if (!event.source) return state.status === "none" && !state.frame ? state : NO_PICTURE;
      if (event.source === state.source) return state;
      return { source: event.source, frame: state.frame, status: "loading" };
    case "loaded":
      if (event.source !== state.source) return state;
      return { source: event.source, frame: { src: event.src, at: event.at, source: event.source }, status: "ready", settledAt: event.at };
    case "failed":
      if (event.source !== state.source) return state;
      return state.frame?.source === event.source
        ? { ...state, status: "stale", settledAt: event.at }
        : { source: event.source, status: "failed", settledAt: event.at };
  }
}

/**
 * The URL a refresh loads: the source with `t=<at>` added, so no cache answers with the frame already shown. An
 * inline `data:` or `blob:` URL can't take a query and is left alone: a demo still is a still.
 */
export function refreshUrl(src: string, at: number): string {
  if (/^(data|blob):/i.test(src)) return src;
  const hash = src.indexOf("#");
  const base = hash < 0 ? src : src.slice(0, hash);
  const fragment = hash < 0 ? "" : src.slice(hash);
  return `${base}${base.includes("?") ? "&" : "?"}t=${at}${fragment}`;
}

/** How long until the next refresh: none without one, else what is left of the interval since the last load settled. */
export function nextRefreshIn(refresh: number | undefined, settledAt: number | undefined, now: number): number | undefined {
  if (!refresh || refresh <= 0 || settledAt === undefined) return undefined;
  return Math.max(0, settledAt + refresh - now);
}
