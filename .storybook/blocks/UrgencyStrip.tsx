import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import "./UrgencyStrip.css";

/*
 * A prototype of a page-wide urgency surface for Orb (issue #188), drawn only in Orb → Foundations → Scan task so the
 * scan-task comparison (#186) can try pages with and without it. It sits here, outside the skin's package, so nothing
 * ships it: the Lovelace card never draws it, and spec/orb.md keeps its "no alert region" rule until the comparison
 * decides. It draws on Orb's tokens and reads Orb's card markup (`.hd`, `.hd-name`, `.hd-open`, the header's `.hh`).
 *
 * The design under test, as the decision on #188 gives it: a strip drawn over the header, so the page doesn't shift;
 * shown whenever a card on the page is urgent or an alarm (core's Severity, the `data-level` every card writes); the
 * first alarm, else the first urgent card, then `+N` for the rest; a tap on the entry opens that card's sheet, and on a
 * far wall panel the entry only names the card. Its marker is #189's: solid for urgent, warn filled for an alarm.
 *
 * Being a prototype, it reads the page it covers rather than a model: each pressing card's name, its warning's words
 * and its open button come from the card's own markup, and a MutationObserver keeps them current as the demo house
 * changes, so a lock unjammed in its sheet leaves the strip.
 */

interface Entry {
  key: string;
  level: "urgent" | "alarm";
  name: string;
  word: string;
  card: HTMLElement;
}

/** The cards on the page that press (urgent or alarm), alarms first, each kind in page order. Sheets are left out. */
function pressing(root: HTMLElement): Entry[] {
  const cards = [...root.querySelectorAll<HTMLElement>('.hd:not(.hd--sheet):is([data-level="urgent"], [data-level="alarm"])')];
  const entries = cards.map((card, index): Entry => {
    const level = card.dataset.level as Entry["level"];
    const name = card.querySelector(".hd-name")?.textContent?.trim() ?? "";
    // An alarm's pill says its alert, then what set it off ("Alarm · Back door"); its alert goes where it repeats the name.
    const said = (level === "alarm" ? card.querySelector(".hd-alarm-l") : card.querySelector(".hd-head .hd-warn"))?.textContent?.trim() ?? "";
    const parts = said.split(" · ");
    const word = (parts.length > 1 && parts[0].toLowerCase() === name.toLowerCase() ? parts.slice(1) : parts).join(" · ");
    return { key: `${index}:${level}:${name}:${word}`, level, name, word, card };
  });
  return [...entries.filter((e) => e.level === "alarm"), ...entries.filter((e) => e.level === "urgent")];
}

/** How far the strip reaches past the header's box, so no glyph of the title shows around its rounded corners. */
const BLEED = 6;

/** Where the header sits in the wrapper, less its clock: the box the strip covers. */
function headerBox(root: HTMLElement): CSSProperties | null {
  const header = root.querySelector<HTMLElement>(".hh");
  if (!header) return null;
  const base = root.getBoundingClientRect();
  const box = header.getBoundingClientRect();
  const clock = header.querySelector<HTMLElement>(".hh-time")?.getBoundingClientRect();
  const right = clock ? clock.left - 16 : box.right;
  return { top: box.top - base.top - BLEED, left: box.left - base.left - BLEED, width: right - box.left + 2 * BLEED, height: box.height + 2 * BLEED };
}

/**
 * Wraps a dashboard page and draws the strip over its header while a card on it is urgent or an alarm. `far` is a
 * wall panel read from across the room: its entry names the card and opens nothing.
 */
export function UrgencyStrip({ far = false, children }: { far?: boolean; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [box, setBox] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const read = () => {
      const next = pressing(el);
      setEntries((prev) => (prev.length === next.length && prev.every((e, i) => e.key === next[i].key && e.card === next[i].card) ? prev : next));
      const nextBox = headerBox(el);
      setBox((prev) => (JSON.stringify(prev) === JSON.stringify(nextBox) ? prev : nextBox));
    };
    read();
    const page = el.firstElementChild;
    const mutations = new MutationObserver(read);
    if (page) mutations.observe(page, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-level"], characterData: true });
    const sizes = new ResizeObserver(read);
    sizes.observe(el);
    return () => {
      mutations.disconnect();
      sizes.disconnect();
    };
  }, []);

  const [first, ...rest] = entries;
  return (
    <div ref={root} className="us-wrap">
      {children}
      {first && box && (
        <section className="us" aria-label="Needs you" data-viewing={far ? "far" : undefined} style={box}>
          <EntryView entry={first} far={far} />
          {rest.length > 0 && <span className="us-more" aria-label={`and ${rest.length} more`}>+{rest.length}</span>}
        </section>
      )}
    </div>
  );
}

function EntryView({ entry, far }: { entry: Entry; far: boolean }) {
  const body = (
    <>
      {entry.level === "urgent" && (
        <span className="us-cue" aria-hidden="true">
          <svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" /><path d="M7 3.8v4.1M7 10.3h.01" /></svg>
        </span>
      )}
      <span className="us-l"><b>{entry.name}</b>{entry.word && <span className="us-w"> · {entry.word}</span>}</span>
    </>
  );
  if (far) return <p className="us-e" data-level={entry.level}>{body}</p>;
  const open = () => entry.card.querySelector<HTMLButtonElement>(".hd-open")?.click();
  return (
    <button type="button" className="us-e" data-level={entry.level} aria-haspopup="dialog" aria-label={`${entry.name}${entry.word ? `: ${entry.word}` : ""}, details`} onClick={open}>
      {body}
    </button>
  );
}
