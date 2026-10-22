import { Children, cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { SheetExtra } from "../shared/ui";
import type { Vars, WidgetFootprint } from "../shared/ui";
import "./Bundle.css";

type Tile = ReactElement<{ footprint?: WidgetFootprint }>;
const tiles = (children: ReactNode) => Children.toArray(children).filter(isValidElement) as Tile[];

/**
 * Joined: equal compact members sharing one card. Members can be any widget type; the bundle owns
 * their footprint so a horizontal bundle is 60px and a stacked bundle follows the 60px + 8px rhythm.
 */
export function JoinedBundle({ label, children }: { label?: string; children: ReactNode }) {
  const parts = tiles(children).map((tile) => cloneElement(tile, { footprint: "compact" }));
  return (
    <div className="hb-c">
      <div className="hb hb--joined" role={label ? "group" : undefined} aria-label={label} data-n={parts.length} style={{ "--n": parts.length } as Vars}>
        {parts.map((t, i) => <div className="hb-part" key={t.key ?? i}>{t}</div>)}
      </div>
    </div>
  );
}

/**
 * Lead and rows: a standard widget followed by compact widgets in one card.
 * The bundle owns every member's footprint, so its total height stays on the shared modular grid.
 */
export function LeadBundle({ lead, label, sheetTitle = "Also in this bundle", children }: { lead: Tile; label?: string; sheetTitle?: string; children: ReactNode }) {
  const leadTile = cloneElement(lead, { footprint: "standard" });
  const rows = tiles(children).map((tile) => cloneElement(tile, { footprint: "compact" }));
  return (
    <div className="hb-c">
      <div className="hb hb--lead" role={label ? "group" : undefined} aria-label={label}>
        <div className="hb-part hb-lead">
          <SheetExtra.Provider value={{ title: sheetTitle, content: rows.map((r, i) => <div className="hb-part" key={r.key ?? i}>{r}</div>) }}>
            {leadTile}
          </SheetExtra.Provider>
        </div>
        {rows.map((r, i) => <div className="hb-part hb-row" key={r.key ?? i}>{r}</div>)}
      </div>
    </div>
  );
}
