/**
 * Opt-in performance marks for a deployed skin's resource.
 *
 * Off is the default and stays invisible: every function here returns before it touches the DOM, the
 * Performance API or a listener unless the page opted in with `?dashhaus_perf=1` or
 * `localStorage["dashhaus:perf"] = "1"`. On, it records `dashhaus:<name>` Performance marks and keeps the
 * same marks, with their details, in `window.__dashhausPerf` for the repo's Playwright collector.
 *
 * The resource marks what a user waits for: its entry evaluating, the Lovelace element connecting and its
 * store connecting, the first render painting, a pointer press, a details surface appearing, and one
 * action from Home Assistant's service call to the entity update painting. The collector combines them
 * with the browser's navigation, paint and long-task entries.
 */

export type PerfDetail = Record<string, string | number | boolean | null | undefined>;

export interface PerfMark {
  /** Without the `dashhaus:` prefix, e.g. "render:painted". */
  name: string;
  /** `performance.now()` when it happened. */
  at: number;
  detail?: Record<string, string | number | boolean | null>;
}

/** The buffer a collector reads from the page. */
export interface PerfBuffer {
  version: 1;
  enabled: true;
  /** `performance.now()` when the opt-in was first read. */
  startedAt: number;
  marks: PerfMark[];
}

declare global {
  interface Window {
    __dashhausPerf?: PerfBuffer;
  }
}

const QUERY = "dashhaus_perf";
const STORAGE = "dashhaus:perf";
/** Enough for a dashboard's load and a few interactions; a long-lived page stops growing rather than leaking. */
const LIMIT = 2000;

let enabled: boolean | undefined;

const now = () => (typeof performance === "undefined" ? 0 : performance.now());

/** Whether this page asked for the marks. Read once: a page opts in before its first dashhaus code runs. */
export function perfEnabled(): boolean {
  if (enabled !== undefined) return enabled;
  enabled = false;
  if (typeof window === "undefined") return enabled;
  try {
    const query = new URLSearchParams(window.location.search).get(QUERY);
    enabled = query === "1" || window.localStorage.getItem(STORAGE) === "1";
  } catch {
    // A blocked query or storage is not an opt-in.
  }
  if (enabled) install();
  return enabled;
}

/** Record one mark. A no-op when the page did not opt in. */
export function perfMark(name: string, detail?: PerfDetail) {
  if (!perfEnabled()) return;
  const buffer = window.__dashhausPerf;
  if (!buffer || buffer.marks.length >= LIMIT) return;
  const mark: PerfMark = { name, at: now() };
  if (detail) {
    const clean = Object.fromEntries(Object.entries(detail).filter(([, value]) => value !== undefined));
    if (Object.keys(clean).length) mark.detail = clean as PerfMark["detail"];
  }
  buffer.marks.push(mark);
  try {
    performance.mark(`dashhaus:${name}`);
  } catch {
    // Performance.mark is optional; the buffer is the record.
  }
}

/**
 * Record a mark after the browser has painted the work a handler or effect just did: two animation
 * frames, so the commit and its style/layout pass are behind it. A no-op when the page did not opt in.
 */
export function perfMarkAfterPaint(name: string, detail?: PerfDetail) {
  if (!perfEnabled()) return;
  if (typeof requestAnimationFrame !== "function") {
    perfMark(name, detail);
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => perfMark(name, detail)));
}

function install() {
  if (!window.__dashhausPerf) {
    window.__dashhausPerf = { version: 1, enabled: true, startedAt: now(), marks: [] };
  }
  // A press starts the clock for whatever it opens or switches; capture on the document so it also sees
  // events from inside a card's shadow root.
  window.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button, [role='button'], a") : null;
    perfMark("input:pointerdown", {
      label: target?.getAttribute("aria-label") ?? target?.textContent?.trim().slice(0, 80) ?? undefined,
      tag: (target ?? (event.target instanceof Element ? event.target : null))?.tagName.toLowerCase(),
    });
  }, { capture: true, passive: true });
}
