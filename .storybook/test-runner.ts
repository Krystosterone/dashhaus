import type { TestRunnerConfig } from "@storybook/test-runner";
import { getStoryContext } from "@storybook/test-runner";
import { injectAxe, getAxeResults } from "axe-playwright";
import { GLOW_BUDGET, glowCensus } from "./glow-census";

/**
 * Every story must render and pass axe (a11y). Field modules must also fit their own
 * container; a violation reports the module and measured widths. An Orb readout keeps its figures inside it. In both
 * skins, a clip never cuts a 12-hour time or a warning's word that fits alone, and a story never draws two clocks.
 * Where Orb stacks cards in one column, each glowing card's damping is the attention budget's (./glow-census.ts).
 */
const config: TestRunnerConfig = {
  async postVisit(page, context) {
    const { parameters } = await getStoryContext(page, context);
    // Let entrances settle first (a sheet fading in), so contrast is measured at full opacity. Looping animations never
    // finish, so they're left out. A long finite one is an alarm flash, not an entrance: field blinks once a second for
    // ten seconds, and a story that shows one must not wait it out. End it at its final state (the alarm's base style)
    // instead, then wait for what is left. Storybook itself pauses the CSS animations a story starts with at their last
    // keyframe when the runner renders it: that is an entrance's settled state, but a flash's dim half, so a paused
    // long one is ended too, and a paused animation, which never finishes, isn't waited for.
    await page.evaluate(() => {
      const finite = () => document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
      for (const animation of finite()) {
        if ((animation.effect?.getComputedTiming().activeDuration ?? 0) > 1_000) animation.finish();
      }
      return Promise.all(finite().filter((a) => a.playState === "running").map((a) => a.finished.catch(() => undefined)));
    });
    const overflows = await page.locator("#storybook-root .fd-module").evaluateAll((modules) =>
      modules.flatMap((module) => {
        const element = module as HTMLElement;
        if (element.scrollWidth <= element.clientWidth + 1) return [];
        return [{
          name: element.querySelector(".fd-name")?.textContent?.trim() || "unnamed",
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }];
      }),
    );
    if (overflows.length) {
      const lines = overflows.map(({ name, clientWidth, scrollWidth }) => `  ${name}: ${scrollWidth}px content in ${clientWidth}px module`);
      throw new Error(`Field module horizontal overflow\n${lines.join("\n")}`);
    }
    // A Field row's screen holds its figure inside its inset, four places as three (spec/field.md → Footprints), a key's
    // verb is never cut, and a module's today and fader keep their legend to one line, so the strip or the slot under it
    // never moves.
    const misfits = await page.locator("#storybook-root .fd-module").evaluateAll((modules) =>
      modules.flatMap((module) => {
        const name = module.querySelector(".fd-name")?.textContent?.trim() || "unnamed";
        const found: string[] = [];
        const screen = module.matches('[data-footprint="compact"]') ? module.querySelector(".fd-screen") : null;
        const read = screen?.querySelector(".fd-read");
        if (screen && read) {
          const inner = screen.getBoundingClientRect().right - parseFloat(getComputedStyle(screen).paddingRight);
          const right = read.getBoundingClientRect().right;
          if (right > inner + 0.5) found.push(`${name}: its row's figure "${read.textContent}" runs ${(right - inner).toFixed(1)}px into the screen's inset`);
        }
        // A key's verb is whole or gone whole beside its glyph (spec/field.md → A key's word is what pressing it does),
        // and under 240 px a module's row of two or more keys shows its glyphs alone.
        const narrowRow = module.matches('[data-footprint="standard"]') && module.getBoundingClientRect().width < 240;
        for (const cap of module.querySelectorAll(".fd-key-in:has(> .fd-key-glyph:not(:empty)) > .fd-key-cap")) {
          const line = cap.parentElement!.getBoundingClientRect();
          const at = cap.getBoundingClientRect();
          if (!at.width || at.top >= line.bottom - 0.5) continue;
          if (cap.scrollWidth > cap.clientWidth + 1) found.push(`${name}: a key cuts its verb "${cap.textContent}" (${cap.scrollWidth - cap.clientWidth}px short)`);
          const row = cap.closest(".fd-keys");
          if (narrowRow && row && row.querySelectorAll(":scope > .fd-key").length > 1) found.push(`${name}: under 240 px its row of keys prints "${cap.textContent}"`);
        }
        for (const legend of module.querySelectorAll(".fd-today > .fd-legend, .fd-fader > .fd-legend")) {
          const line = parseFloat(getComputedStyle(legend).lineHeight);
          const height = legend.getBoundingClientRect().height;
          const whose = legend.parentElement?.matches(".fd-today") ? "today's" : "a fader's";
          if (height > line + 1) found.push(`${name}: ${whose} legend "${legend.textContent}" wraps (${height}px for a ${line}px line)`);
        }
        return found;
      }),
    );
    if (misfits.length) throw new Error(`Field module misfit\n  ${misfits.join("\n  ")}`);
    // An Orb readout's figures stay inside it, so never past the card (spec/orb.md → A readout's second figure is whole
    // or gone whole): what a figure shows on the readout's line fits the line, and a second figure that doesn't fit has
    // gone whole, to the line under it that the readout never shows. What a figure's own ellipsis hides doesn't count.
    const spills = await page.locator("#storybook-root .hd .hd-bar").evaluateAll((bars) =>
      bars.flatMap((bar) => {
        const box = bar.getBoundingClientRect();
        if (!box.width) return [];
        const card = bar.closest(".hd")!;
        return [...bar.children].flatMap((figure) => {
          let left = Infinity, right = -Infinity, top = Infinity;
          const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
              let shownLeft = rect.left, shownRight = rect.right;
              for (let at = node.parentElement; at && at !== bar; at = at.parentElement) {
                if (!/hidden|clip/.test(getComputedStyle(at).overflowX)) continue;
                const clip = at.getBoundingClientRect();
                shownLeft = Math.max(shownLeft, clip.left);
                shownRight = Math.min(shownRight, clip.right);
              }
              if (shownRight - shownLeft <= 0.5) continue;
              left = Math.min(left, shownLeft);
              right = Math.max(right, shownRight);
              top = Math.min(top, rect.top);
            }
          }
          if (right < left || top >= box.bottom - 0.5) return [];
          const past = Math.max(right - box.right, box.left - left);
          if (past <= 0.5) return [];
          const name = card.querySelector(".hd-title")?.textContent?.trim() || "unnamed";
          const footprint = card.className.match(/hd--(compact|featured|sheet)/)?.[1] ?? "standard";
          return [`${name} (${footprint}, ${Math.round(card.getBoundingClientRect().width)}px): its figure "${(figure as HTMLElement).innerText.replace(/\s+/g, " ")}" runs ${past.toFixed(1)}px out of its readout`];
        });
      }),
    );
    if (spills.length) throw new Error(`Orb readout overflow\n  ${spills.join("\n  ")}`);
    // An Orb pill's words end in an ellipsis where they give way, never cut at its edge, and what a press does is whole
    // (spec/orb.md → A pill says what a press does).
    const pills = await page.locator("#storybook-root .hd-pill").evaluateAll((all) =>
      all.flatMap((pill) => {
        if (!pill.clientWidth) return [];
        const card = pill.closest(".hd");
        const where = `${card?.querySelector(".hd-title")?.textContent?.trim() || "unnamed"} (${card?.className.match(/hd--(compact|featured|sheet)/)?.[1] ?? "standard"}, ${Math.round(card?.getBoundingClientRect().width ?? 0)}px)`;
        const found: string[] = [];
        if (pill.scrollWidth > pill.clientWidth + 1) found.push(`${where}: its pill "${(pill as HTMLElement).innerText}" is cut at its edge (${pill.scrollWidth - pill.clientWidth}px)`);
        const action = pill.querySelector(":scope > [data-action]");
        if (action && action.clientWidth && action.scrollWidth > action.clientWidth + 1) found.push(`${where}: its pill cuts what a press does, "${action.textContent}"`);
        return found;
      }),
    );
    if (pills.length) throw new Error(`Orb pill cut\n  ${pills.join("\n  ")}`);
    // Where a line clips, the words around a time give way before it (spec/cards.md → Clock words follow the
    // dashboard's hour cycle): a time on either clock, or a span of them, is whole with its period or gone whole, never
    // `1:44…`, `2:53 A…` or `Fri 1…`. And a warning keeps its word, in either skin (spec/cards.md → A warning's words fit a row):
    // what follows it goes first, so a word that fits alone is never `Stoppe…`. Measured against what the clipping box
    // shows: its content box, less the ellipsis it draws.
    const cuts = await page.evaluate(() => {
      const found: string[] = [];
      /** The nearest box at or above `from` whose line overflows and is clipped, and how far right it shows text. */
      const clipping = (from: Element | null) => {
        for (let box = from; box && box !== document.body; box = box.parentElement) {
          const style = getComputedStyle(box);
          const clips = /hidden|clip/.test(style.overflowX) || style.textOverflow === "ellipsis";
          // A screen reader's own text is clipped on purpose (1 px wide), and a box that scrolls lets its line be reached.
          if (!clips || box.clientWidth <= 1) continue;
          // A box whose line fits clips nothing of it; one further out may still.
          if (box.scrollWidth <= box.clientWidth + 1) continue;
          const shown = box.getBoundingClientRect().left + box.clientLeft + box.clientWidth - parseFloat(style.paddingRight);
          let ellipsis = 0;
          if (style.textOverflow === "ellipsis") {
            const context = document.createElement("canvas").getContext("2d")!;
            context.font = style.font;
            ellipsis = context.measureText("…").width + (parseFloat(style.letterSpacing) || 0);
          }
          return { box, shown: shown - ellipsis, ellipsis };
        }
        return null;
      };
      const span = (node: Text, start: number, end: number) => {
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        // Chromium gives a clipped run its laid-out box and the part its ellipsis leaves, so take their whole extent.
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        return rects.length ? { left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)) } : null;
      };
      const texts = (root: Node, skip?: string) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const out: Text[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!skip || !node.parentElement?.closest(skip)) out.push(node as Text);
        }
        return out;
      };
      // On either clock: `14:05`, `2:05 PM`, or a span of them.
      const TIME = /\d{1,2}:\d\d(?:\u00a0[AP]M)?(?:[–-]\d{1,2}:\d\d(?:\u00a0[AP]M)?)?/g;
      /** Whether the time sits whole in one piece (a skin's `timed`): an ellipsis hides such a piece whole, never cuts it. */
      const whole = (node: Text, box: Element) => {
        for (let at = node.parentElement; at && at !== box; at = at.parentElement) {
          if (getComputedStyle(at).display === "inline-block") return true;
        }
        return false;
      };
      for (const node of texts(document.body)) {
        for (const match of node.data.matchAll(TIME)) {
          const time = span(node, match.index, match.index + match[0].length);
          const clip = time && clipping(node.parentElement);
          if (clip && time.left < clip.shown && time.right > clip.shown + 0.5 && !whole(node, clip.box)) {
            found.push(`"${clip.box.textContent?.trim()}" cuts its time "${match[0].replace("\u00a0", " ")}" (${(time.right - clip.shown).toFixed(1)}px short)`);
          }
        }
      }
      // A warning's word is its first words, up to what follows it: its own element (since when), a ` · ` (what set it
      // off) or a count (` +2`). The word is the last thing on a card to give way, so it is never cut while anything
      // else on its line could go. Only on a card's narrowest sizes, where nothing is left to give way (a Field row
      // under 280 px, a Field module under 240 px, an Orb card under 180 px), may a word too wide for its line alone end
      // in an ellipsis; there a word that fits is still never cut.
      const narrow = (card: Element | null) => {
        if (!card) return false;
        const width = card.getBoundingClientRect().width;
        if (card.matches(".fd-module")) return width < (card.matches('[data-footprint="compact"]') ? 280 : 240);
        return card.matches(".hd") && width < 180;
      };
      for (const warning of document.querySelectorAll(".fd-warn-t, .hd-warn, .hd-alarm-l")) {
        const first = texts(warning, ".fd-sr").find((node) => /\S/.test(node.data));
        const word = first?.data.match(/\S.*?(?=\s+·\s|\s+\+\d|\s*$)/);
        if (!first || !word) continue;
        const shown = span(first, word.index!, word.index! + word[0].length);
        const clip = shown && clipping(first.parentElement);
        if (!clip || shown.right <= clip.shown + 0.5) continue;
        const card = warning.closest(".fd-module, .fd-panel, .hd");
        const fits = shown.right <= clip.shown + clip.ellipsis + 0.5;
        if (!fits && narrow(card)) continue;
        const name = card?.querySelector(".fd-name, .hd-title")?.textContent?.trim() || "unnamed";
        const footprint = card?.getAttribute("data-footprint") ?? card?.className.match(/hd--(compact|featured|sheet)/)?.[1] ?? "standard";
        const where = card?.matches(".fd-module, .hd") ? ` (${footprint}, ${Math.round(card.getBoundingClientRect().width)}px)` : "";
        found.push(`${name}${where}: its warning "${warning.textContent?.replace("Warning: ", "").trim()}" cuts its word "${word[0]}" (${(shown.right - clip.shown).toFixed(1)}px short)`);
      }
      return found;
    });
    if (cuts.length) throw new Error(`A clip cuts a time or a warning's word\n  ${cuts.join("\n  ")}`);
    // A story draws one clock (AGENTS.md → Storybook: a setting changes the whole story or none of it), so a story that
    // says a 12-hour time says no 24-hour one, as a seed left on its own clock would. Only a time no 12-hour clock
    // writes counts: a padded or afternoon hour (`08:20`, `18:30`). A Header story lines up several dashboards' headers,
    // each on its own clock, so it isn't one page.
    const clocks = /\/Dashboards\/Header$/.test(context.title) ? [] : await page.evaluate(() => {
      const text = document.body.innerText;
      if (!/\d:\d\d\u00a0[AP]M|\b\d{1,2}[AP]M\b/.test(text)) return [];
      return [...new Set(text.match(/(?<![\d:.])(?:0\d|1[3-9]|2[0-3]):[0-5]\d(?![\d:])/g) ?? [])];
    });
    if (clocks.length) throw new Error(`A story on two clocks: 12-hour times beside ${clocks.join(", ")}`);
    // A story may draw the budget at other values than layout.css's (Orb → Foundations → Scan task), and says which.
    const glows = await page.evaluate(glowCensus, { ...GLOW_BUDGET, ...parameters.glowBudget });
    if (glows.length) throw new Error(`Orb's attention budget\n  ${glows.join("\n  ")}`);
    // The runner renders every story of a file in the same page, so axe (half a megabyte of script) is injected once
    // per page rather than once per story; a page that was reloaded has lost it and gets it again.
    if (!(await page.evaluate(() => "axe" in window))) await injectAxe(page);
    const results = await getAxeResults(page, "#storybook-root", {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      // Only violations fail a story, so axe skips collecting every passing and inapplicable node, which is most of a
      // run's work and of the result sent back from the page. Violations are reported in full either way.
      resultTypes: ["violations"],
      rules: {
        ...(parameters.a11y?.config?.rules ?? {}),
        // axe's experimental label-content-name-mismatch demands the visible text appear verbatim
        // in the name. This repo deliberately gives richer names (a spoken sentence for a numeric
        // readout, "state · action" pills) built from the same data; verified case by case, the
        // visible information is always in the name, just not as a verbatim run.
        "label-content-name-mismatch": { enabled: false },
      },
    });
    if (results.violations.length) {
      const lines = results.violations.map(
        (v) => `  [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      );
      throw new Error(`axe: ${results.violations.length} violation(s)\n${lines.join("\n")}`);
    }
  },
};

export default config;
