import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import "./foundations.css";

const meta = { title: "Studies/Futura/Foundations/Palette", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type Vars = CSSProperties & Record<`--${string}`, string>;
const GROUPS = [
  { title: "Console", note: "The panel the instruments sit in: a near-black navy page, bezels a step lighter, a sunk groove a step darker, and two edges.", roles: [
    ["Page", "--futura-page"], ["Panel", "--futura-panel"], ["Raised", "--futura-panel-raised"], ["Sunk", "--futura-panel-sunk"], ["Edge", "--futura-edge"], ["Bright edge", "--futura-edge-bright"],
  ] },
  { title: "Ink", note: "Names and figures in ink, labels in muted ink, ticks and empty hours in faint ink (never text).", roles: [
    ["Ink", "--futura-ink"], ["Muted ink", "--futura-ink-muted"], ["Faint ink", "--futura-ink-faint"],
  ] },
  { title: "Signals", note: "Cyan is live: on, cooling, a reading, the page's clock and nav. Amber is energy: a lamp lit, heat going in. Alert is a warning in words, never a glow.", roles: [
    ["Cyan · live", "--futura-cyan"], ["Amber · energy", "--futura-amber"], ["Alert · words", "--futura-alert"],
  ] },
] as const;

function Palette() {
  return (
    <div className="futura-board">
      <div className="futura-board-inner">
        {GROUPS.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            <p className="futura-board-note">{group.note}</p>
            <div className="futura-board-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
              {group.roles.map(([label, token]) => (
                <figure key={token} className="futura-swatch">
                  <div className="futura-swatch-chip" data-glow={group.title === "Signals" && token !== "--futura-alert" ? "" : undefined} style={{ background: `var(${token})`, "--futura-swatch": `var(${token}-glow)` } as Vars} />
                  <figcaption>{label}<br /><code>{token}</code></figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export const Roles: Story = { render: () => <Palette /> };
