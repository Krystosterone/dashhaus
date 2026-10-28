import type { Decorator, Preview } from "@storybook/react";
import { orbStorybook } from "../src/skins/orb/storybook";
import { fieldStorybook } from "../src/skins/field/storybook";

/**
 * Every skin brings its own Storybook setup (src/skins/<skin>/storybook.tsx): a section its story titles start with,
 * its toolbar, the class its page surface puts on <body>, and a decorator. A new skin adds itself here, and its
 * section to storySort below; its decorator and surface apply to its stories only.
 */
const SKINS = [orbStorybook, fieldStorybook];

const withSkin: Decorator = (Story, ctx) => {
  const skin = SKINS.find((s) => ctx.title.startsWith(`${s.section}/`));
  for (const s of SKINS) document.body.classList.toggle(s.surface, s === skin);
  return skin ? skin.decorator(Story, ctx) : <Story />;
};

const preview: Preview = {
  globalTypes: Object.assign({}, ...SKINS.map((s) => s.globalTypes)),
  initialGlobals: Object.assign({}, ...SKINS.map((s) => s.initialGlobals)),
  decorators: [withSkin],
  parameters: {
    backgrounds: { disable: true },
    controls: { expanded: true },
    // Storybook reads this statically, so it must stay a literal: one section per skin, then its own order.
    options: {
      storySort: {
        // Every skin has the same groups in the same order (AGENTS.md → Storybook; src/skins/storybook.test.ts checks).
        order: [
          "Orb", [
            "Cards", ["Light", "Climate", "Sensor", "Weather", "Toggle", "Cover", "Alarm", "Humidifier", "Sound", "Owlet"],
            "Bundles",
            "Dashboards", ["Layouts", ["Phone", "Tablet", "Wall panel", "Phone, ungrouped footprints"], "Header", "Nav bar"],
            "Foundations", ["Palette", "Color temperature", "Compact rows", "Worst case"],
            "Home Assistant", ["Dashboard", "Light", "Climate", "Sensor", "Weather", "Toggle", "Cover", "Alarm", "Humidifier", "Sound", "Owlet"],
          ],
          "Field", [
            "Cards", ["Light", "Climate"],
            "Bundles",
            "Dashboards",
            "Foundations",
            "Home Assistant", ["Dashboard", "Light", "Climate"],
          ],
        ],
      },
    },
  },
};

export default preview;
