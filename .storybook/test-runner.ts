import type { TestRunnerConfig } from "@storybook/test-runner";
import { getStoryContext } from "@storybook/test-runner";
import { injectAxe, getAxeResults } from "axe-playwright";

/**
 * Every story must render and pass axe (a11y). Field modules must also fit their own
 * container; a violation reports the module and measured widths. In both skins, a clip never cuts a 12-hour time
 * or a warning's word that fits alone, and a story never draws two clocks.
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
    // A Field row's screen holds its figure inside its inset, four places as three (spec/field.md → Footprints), and a
    // module's today and fader keep their legend to one line, so the strip or the slot under it never moves.
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
    // Where a line clips, the words around a time give way before it (spec/cards.md → Clock words follow the
    // dashboard's hour cycle): a 12-hour time, or a span ending in one, is whole with its period or gone whole, never
    // `1:44…` or `2:53 A…`. And a warning keeps its word, in either skin (spec/cards.md → A warning's words fit a row):
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
      const TIME = /\d{1,2}:\d\d(?:\u00a0[AP]M)?[–-]\d{1,2}:\d\d\u00a0[AP]M|\d{1,2}:\d\d\u00a0[AP]M/g;
      for (const node of texts(document.body)) {
        for (const match of node.data.matchAll(TIME)) {
          const time = span(node, match.index, match.index + match[0].length);
          const clip = time && clipping(node.parentElement);
          if (clip && time.left < clip.shown && time.right > clip.shown + 0.5) {
            found.push(`"${clip.box.textContent?.trim()}" cuts its time "${match[0].replace("\u00a0", " ")}" (${(time.right - clip.shown).toFixed(1)}px short)`);
          }
        }
      }
      // A warning's word is its first words, up to what follows it: its own element (since when), a ` · ` (what set it
      // off) or a count (` +2`). Where the word alone is wider than its box, no order could keep it: that is a word too
      // long for the width, not this rule.
      for (const warning of document.querySelectorAll(".fd-warn-t, .hd-warn, .hd-alarm-l")) {
        const first = texts(warning, ".fd-sr").find((node) => /\S/.test(node.data));
        const word = first?.data.match(/\S.*?(?=\s+·\s|\s+\+\d|\s*$)/);
        if (!first || !word) continue;
        const shown = span(first, word.index!, word.index! + word[0].length);
        const clip = shown && clipping(first.parentElement);
        if (clip && shown.right > clip.shown + 0.5 && shown.right <= clip.shown + clip.ellipsis + 0.5) {
          const module = warning.closest(".fd-module, .fd-panel");
          const name = module?.querySelector(".fd-name")?.textContent?.trim() || "unnamed";
          const where = module?.matches(".fd-module") ? ` (${module.getAttribute("data-footprint")}, ${Math.round(module.getBoundingClientRect().width)}px)` : "";
          found.push(`${name}${where}: its warning "${warning.textContent?.replace("Warning: ", "").trim()}" cuts its word "${word[0]}" (${(shown.right - clip.shown).toFixed(1)}px short)`);
        }
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
