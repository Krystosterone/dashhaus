import { Children, cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { SheetExtra } from "../shared/ui";
import type { Vars } from "../shared/ui";
import "./Bundle.css";

type Tile = ReactElement<{ density?: string }>;
const tiles = (children: ReactNode) => Children.toArray(children).filter(isValidElement) as Tile[];

/**
 * Joined: equal members sharing one card, side by side, with no header. Made for mini toggles
 * (Sleep Mode and Do Not Disturb). Each half works exactly as on its own: tap to switch, hold for its sheet.
 * Where the halves would be too narrow (a bundle under 300px), they stack.
 */
export function JoinedBundle({ label, children }: { label?: string; children: ReactNode }) {
  const parts = tiles(children);
  return (
    <div className="hb-c">
      <div className="hb hb--joined" role={label ? "group" : undefined} aria-label={label} data-n={parts.length} style={{ "--n": parts.length } as Vars}>
        {parts.map((t, i) => <div className="hb-part" key={t.key ?? i}>{t}</div>)}
      </div>
    </div>
  );
}

/**
 * Lead and rows: one widget stays fully itself (header, name, control); the others sit below it as
 * thin rows in the same card. The lead's history strip moves to its sheet, and its sheet lists the rows
 * too, live. Height: the lead's card plus 56px per row, whatever the state.
 * Rows are any tiles; they're shown thin whatever density they were given.
 */
export function LeadBundle({ lead, label, sheetTitle = "Also in this bundle", children }: { lead: ReactElement; label?: string; sheetTitle?: string; children: ReactNode }) {
  const rows = tiles(children).map((t) => cloneElement(t, { density: "thin" }));
  return (
    <div className="hb-c">
      <div className="hb hb--lead" role={label ? "group" : undefined} aria-label={label}>
        <div className="hb-part hb-lead">
          <SheetExtra.Provider value={{ title: sheetTitle, content: rows.map((r, i) => <div className="hb-part" key={r.key ?? i}>{r}</div>) }}>
            {lead}
          </SheetExtra.Provider>
        </div>
        {rows.map((r, i) => <div className="hb-part hb-row" key={r.key ?? i}>{r}</div>)}
      </div>
    </div>
  );
}
