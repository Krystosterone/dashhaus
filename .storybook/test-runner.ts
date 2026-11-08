import type { TestRunnerConfig } from "@storybook/test-runner";
import { getStoryContext } from "@storybook/test-runner";
import { injectAxe, getAxeResults } from "axe-playwright";

/**
 * Every story must render and pass axe (a11y). Field modules must also fit their own
 * container; a violation reports the module and measured widths.
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
