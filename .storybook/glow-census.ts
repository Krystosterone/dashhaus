/**
 * Orb's attention budget, measured in Chromium (spec/orb.md → Composing for a glance). jsdom can't evaluate the `:has`
 * cascade `src/skins/orb/dashboards/layout.css` damps glow with, so the Storybook run holds it here, on every story that
 * draws a one-column grid or a one-track Lovelace row, and costs nothing on the rest.
 *
 * The oracle is what main drew before urgency became a factor, times that factor: a glowing card's `--glow-damp` is 1
 * in the first cell of its container that holds a glowing card, `later` in each cell after it, and that times
 * `underAlert` while the container holds an urgent or alarm card anywhere (`data-level`; advisory never outranks). It
 * models the two quirks layout.css keeps: a compact glowing card claims the first cell though its glow is hidden, and an
 * open sheet, drawn in its tile's cell, takes that cell's position. A compact card's glow layer is 0 whatever its damping.
 *
 * It reads the custom property rather than the glow layer's opacity, so it never waits on the layer's 300 ms fade: a
 * probe inside the card evaluates `--glow-damp` as an opacity, since a custom property's computed value is its
 * unevaluated `calc()`. The values are layout.css's; change them only with it (src/skins/orb/styles/rules.test.ts).
 */
export const GLOW_BUDGET = { later: 0.5, underAlert: 1 };

/** Runs in the page, so it closes over nothing: every card whose glow disagrees with the oracle, said. */
export function glowCensus({ later, underAlert }: typeof GLOW_BUDGET): string[] {
  const containers = [...document.querySelectorAll('.dash-grid--1, .dash-row[data-tracks="1"]')];
  if (!containers.length) return [];
  const found: string[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < 0.001;
  for (const card of document.querySelectorAll<HTMLElement>(".hd[data-glow]")) {
    let position = 1;
    let urgency = 1;
    for (const container of containers) {
      const cells = [...container.children];
      const at = cells.findIndex((cell) => cell.contains(card));
      if (at < 0) continue;
      if (cells.slice(0, at).some((cell) => cell.querySelector(".hd[data-glow]"))) position = later;
      if (container.querySelector(':scope > * .hd:is([data-level="urgent"], [data-level="alarm"])')) urgency = underAlert;
    }
    const expected = position * urgency;
    const probe = document.createElement("i");
    probe.style.cssText = "position: absolute; opacity: calc(var(--glow-damp, 1)); transition: none";
    card.append(probe);
    const damp = Number.parseFloat(getComputedStyle(probe).opacity);
    probe.remove();
    const name = document.getElementById(card.getAttribute("aria-labelledby") ?? "")?.textContent?.trim() || "unnamed";
    const where = `${name}${card.matches(".hd--sheet") ? " (sheet)" : card.matches(".hd--compact") ? " (compact)" : ""}`;
    if (!near(damp, expected)) found.push(`${where}: --glow-damp ${damp}, the budget says ${expected} (position ${position} × urgency ${urgency})`);
    if (card.matches(".hd--compact")) {
      const layer = Number.parseFloat(getComputedStyle(card, "::before").opacity);
      if (!near(layer, 0)) found.push(`${where}: a compact card's glow layer is ${layer}, not 0`);
    }
  }
  return found;
}
