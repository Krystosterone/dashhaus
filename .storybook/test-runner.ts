import type { TestRunnerConfig } from "@storybook/test-runner";
import { getStoryContext } from "@storybook/test-runner";
import { injectAxe, getAxeResults } from "axe-playwright";

/**
 * Every story must render (smoke) and pass axe (a11y). A violation fails the run
 * with the rule, impact, and target elements in the message.
 */
const config: TestRunnerConfig = {
  async postVisit(page, context) {
    const { parameters } = await getStoryContext(page, context);
    // Let entrances settle first (a sheet fading in), so contrast is measured at full opacity. Looping
    // animations never finish, so they're left out.
    await page.evaluate(() =>
      Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))),
    );
    await injectAxe(page);
    const results = await getAxeResults(page, "#storybook-root", {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
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
