import { Children, cloneElement, isValidElement, useContext, useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { BundleLid, CardHeadingLevelContext, SheetExtra } from "../shared/ui";
import type { Vars, CardFootprint } from "../shared/ui";
import "./Bundle.css";

type Tile = ReactElement<{ footprint?: CardFootprint }>;
const tiles = (children: ReactNode) => Children.toArray(children).filter(isValidElement) as Tile[];

/**
 * How many 60 px units a joined bundle of `n` members is at `width` px: one row while each member gets about 170 px,
 * else stacked (four go two by two from 450 through 599 px). It mirrors Bundle.css's container queries, which draw
 * it; Bundle.test.ts holds the two to the same widths. An unknown width is one row.
 */
export function joinedUnits(n: number, width: number | undefined): number {
  if (n <= 1 || width === undefined) return 1;
  if (width < 340) return n;
  if (n === 3 && width < 510) return 3;
  if (n === 4) return width < 450 ? 4 : width < 600 ? 2 : 1;
  return 1;
}

/**
 * Joined: equal compact members sharing one card. Members can be any card type; the bundle owns
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
 * Lead and rows: a standard card followed by compact cards in one card.
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

/**
 * Titled: the parts of one thing, usually one device, under a lid that names it and its room once.
 * The lid is one 60px unit and every member is a compact row, so three parts make 264px, the featured height.
 * Members name what they are on the thing ("Power", "Night light") and drop the lid's room from their cards;
 * their own sheets say whose part it is. The lid is a heading, not a card: it opens nothing, since a sheet of
 * the same rows would only repeat the bundle.
 */
export function TitledBundle({ title, area, children }: { title: string; area?: string; children: ReactNode }) {
  const id = useId();
  const Heading = useContext(CardHeadingLevelContext) === 3 ? "h3" : "h2";
  const rows = tiles(children).map((tile) => cloneElement(tile, { footprint: "compact" }));
  return (
    <div className="hb-c">
      <BundleLid.Provider value={{ title, area }}>
        <div className="hb hb--titled" role="group" aria-labelledby={id}>
          <div className="hb-lid">
            <Heading className="hb-lid-name" id={id}>{title}</Heading>
            {area && <p className="hb-lid-area">{area}</p>}
          </div>
          {rows.map((r, i) => <div className="hb-part hb-row" key={r.key ?? i}>{r}</div>)}
        </div>
      </BundleLid.Provider>
    </div>
  );
}
