import { useState } from "react";
import type { ReactNode } from "react";
import { DataToggle } from "./DataToggle";
import type { Data } from "./DataToggle";

/** One row of the page: a seed drawn in a footprint. */
export type Draw<F extends string> = (footprint: F) => ReactNode;

/** A card on the page: its name, and a row per seed, its worst case and a little demo data to hold it against. */
export interface WorstCaseCard<F extends string> {
  name: string;
  rows: Record<Data, Draw<F>[]>;
}

/** One column of the page: a width, in px, and the footprint drawn at it. */
export interface WorstCaseColumn<F extends string> {
  width: number;
  footprint: F;
}

/** A card's rows from its seeds: `name` captions them on the page. */
export function card<S, F extends string>(name: string, worst: readonly S[], demo: readonly S[], draw: (seed: S, footprint: F) => ReactNode): WorstCaseCard<F> {
  const rows = (seeds: readonly S[]) => seeds.map((seed): Draw<F> => (footprint) => draw(seed, footprint));
  return { name, rows: { worst: rows(worst), demo: rows(demo) } };
}

/** Storybook's own small print, the same on every skin's page and drawn in none of them, legible on any skin's ground. */
const CAPTION = { margin: 0, justifySelf: "start", padding: "2px 8px", borderRadius: 4, background: "#ececec", color: "#222", font: "500 12px/16px system-ui, sans-serif" } as const;

function Row<F extends string>({ draw, columns, captioned }: { draw: Draw<F>; columns: readonly WorstCaseColumn<F>[]; captioned: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>
      {columns.map(({ width, footprint }) => (
        <div key={`${width}-${footprint}`} style={{ display: "grid", gap: 4, width, maxWidth: "100%" }}>
          {captioned && <p style={CAPTION}>{`${width} px · ${footprint}`}</p>}
          {draw(footprint)}
        </div>
      ))}
    </div>
  );
}

/**
 * Every skin's Foundations → Worst case: each card's rows under its name, each column captioned with its width and
 * footprint over the card's first row (every row wraps alike, so the captions hold for the rows under them), and the
 * Demo data / Worst case toggle. The captions are Storybook's chrome, never inside a card.
 */
export function WorstCasePage<F extends string>({ cards, columns }: { cards: readonly WorstCaseCard<F>[]; columns: readonly WorstCaseColumn<F>[] }) {
  const [data, setData] = useState<Data>("worst");
  return (
    <div key={data} style={{ display: "grid", gap: 24, paddingBottom: 72 }}>
      {cards.map(({ name, rows }) => (
        <section key={name} style={{ display: "grid", gap: 12 }}>
          <h2 style={{ ...CAPTION, font: "600 14px/20px system-ui, sans-serif" }}>{name}</h2>
          {rows[data].map((draw, s) => <Row key={s} draw={draw} columns={columns} captioned={s === 0} />)}
        </section>
      ))}
      <DataToggle value={data} onChange={setData} />
    </div>
  );
}
