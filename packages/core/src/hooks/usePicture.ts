import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { NO_PICTURE, nextRefreshIn, pictureReducer, refreshUrl } from "./picture";
import type { PictureStatus } from "./picture";

export interface PictureOptions {
  /**
   * Load a new frame every this many milliseconds while the picture is on screen and the page is visible: a camera's
   * still. Leave it out for a picture that changes only when its URL does: a player's artwork.
   */
  refresh?: number;
  /**
   * Hold the frame instead of refreshing on the timer: it still loads when first seen and when the page becomes
   * visible again (the panel wakes). For a `quiet` dashboard, where nothing changes by itself.
   */
  paused?: boolean;
}

export interface Picture<T extends Element = HTMLElement> {
  /** Put it on the picture's box: nothing loads until that box is on screen, and nothing ever loads without it. */
  ref: (node: T | null) => void;
  /** The decoded frame to draw, or nothing yet. */
  src?: string;
  status: PictureStatus;
  /** When the frame drawn loaded (epoch ms), so a stale still can say when it is from. */
  at?: number;
}

/** Whether the page is visible, and how many times it has become visible again since. */
function usePageVisibility() {
  const visibleNow = () => typeof document === "undefined" || document.visibilityState !== "hidden";
  const [page, setPage] = useState(() => ({ visible: visibleNow(), wakes: 0 }));
  useEffect(() => {
    const changed = () => setPage((current) => {
      const visible = visibleNow();
      return visible === current.visible ? current : { visible, wakes: current.wakes + (visible ? 1 : 0) };
    });
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, []);
  return page;
}

/**
 * Whether the node is on screen. With no node it never is, so a picture whose `ref` is never attached never loads.
 * Without IntersectionObserver an attached node counts as on screen.
 */
function useOnScreen(node: Element | null) {
  const observable = typeof IntersectionObserver !== "undefined";
  const [intersecting, setIntersecting] = useState(false);
  useEffect(() => {
    if (!node || !observable) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) setIntersecting(entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, observable]);
  return node != null && (!observable || intersecting);
}

/**
 * A picture's lifecycle, for a camera's still or a player's artwork: it loads only once its box is on screen and the
 * page is visible, refreshes (`refresh`) only while both stay true, never in the background, and decodes each frame
 * off the page (`Image.decode()`) before drawing it, so a frame swaps without a flash. The last good frame stays up
 * while the next loads and when a refresh fails (`stale`); a new source that fails clears it (`failed`); no source
 * clears it at once and cancels its load. It never sizes anything: the box that draws it has a fixed size.
 */
export function usePicture<T extends Element = HTMLElement>(src: string | undefined, { refresh, paused = false }: PictureOptions = {}): Picture<T> {
  const [node, setNode] = useState<T | null>(null);
  const onScreen = useOnScreen(node);
  const page = usePageVisibility();
  const seen = onScreen && page.visible;
  const [state, dispatch] = useReducer(pictureReducer, NO_PICTURE);
  const loading = useRef<HTMLImageElement | null>(null);

  const cancel = useCallback(() => {
    const image = loading.current;
    loading.current = null;
    if (image) image.src = "";
  }, []);

  const load = useCallback((source: string) => {
    cancel();
    const image = new Image();
    image.decoding = "async";
    loading.current = image;
    const url = refresh ? refreshUrl(source, Date.now()) : source;
    const settle = (ok: boolean) => {
      if (loading.current !== image) return;
      loading.current = null;
      dispatch(ok ? { type: "loaded", source, src: url, at: Date.now() } : { type: "failed", source, at: Date.now() });
    };
    if (typeof image.decode === "function") {
      image.src = url;
      image.decode().then(() => settle(true), () => settle(false));
    } else {
      image.onload = () => settle(true);
      image.onerror = () => settle(false);
      image.src = url;
    }
  }, [cancel, refresh]);

  // Follow the source; a new one (or none) cancels what was loading for the last.
  useEffect(() => {
    dispatch({ type: "source", source: src });
    return cancel;
  }, [src, cancel]);

  // The first frame of a source, once it is seen.
  useEffect(() => {
    if (!seen || !src || state.source !== src || state.status !== "loading" || loading.current) return;
    load(src);
  }, [seen, src, state.source, state.status, load]);

  // The refresh, counted from the last load, only while seen: coming back late refreshes at once.
  useEffect(() => {
    if (!seen || !src || paused || state.source !== src) return;
    const wait = nextRefreshIn(refresh, state.settledAt, Date.now());
    if (wait === undefined) return;
    const timer = setTimeout(() => load(src), wait);
    return () => clearTimeout(timer);
  }, [seen, src, paused, refresh, state.source, state.settledAt, load]);

  // Paused, a refreshing picture still takes one new frame when the page wakes.
  const wake = useRef(page.wakes);
  useEffect(() => {
    if (page.wakes === wake.current) return;
    wake.current = page.wakes;
    if (paused && refresh && seen && src && state.source === src && state.status !== "loading") load(src);
  }, [page.wakes, paused, refresh, seen, src, state.source, state.status, load]);

  const status = paused && refresh && state.status === "ready" ? "stale" : state.status;
  return { ref: setNode, src: state.frame?.src, status, at: state.frame?.at };
}
