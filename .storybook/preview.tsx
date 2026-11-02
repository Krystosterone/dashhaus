import type { Decorator, Preview } from "@storybook/react";
import { orbStorybook } from "@dashhaus/orb/storybook";
import { fieldStorybook } from "@dashhaus/field/storybook";
// new-skin: storybook imports

/**
 * What a skin's Storybook setup declares (src/skins/<skin>/storybook.tsx): a section its story titles start with, its
 * toolbar, the class its page surface puts on <body>, a decorator and, optionally, its web font's stylesheet URL.
 */
interface SkinStorybook {
  section: string;
  surface: string;
  /** Linked from <head> once, the first time one of the skin's stories renders, as its Lovelace card links it. */
  fontHref?: string;
  globalTypes: Preview["globalTypes"];
  initialGlobals: Preview["initialGlobals"];
  decorator: Decorator;
}

/**
 * Every skin brings its own Storybook setup. A new skin adds itself here, and its section to storySort below; its
 * decorator, surface and font apply to its stories only. Orb's and Field's fonts are in preview-head.html, linked
 * before the first story paints.
 */
const SKINS: SkinStorybook[] = [
  orbStorybook,
  fieldStorybook,
  // new-skin: storybook setups
];

/** The skin's font stylesheet, linked once: the same href is never added twice. */
function linkFont(href: string) {
  if (document.head.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

const withSkin: Decorator = (Story, ctx) => {
  const skin = SKINS.find((s) => ctx.title.startsWith(`${s.section}/`));
  for (const s of SKINS) document.body.classList.toggle(s.surface, s === skin);
  if (skin?.fontHref) linkFont(skin.fontHref);
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
        // Every skin has the same groups in the same order, Bundles in orb only (AGENTS.md → Storybook; verify/storybook.test.ts checks).
        order: [
          "Orb", [
            "Cards", [
              "Light", "Climate", "Sensor", "Weather", "Toggle", "Cover", "Alarm", "Humidifier", "Sound", "Owlet",
              // new-card: cards
            ],
            "Bundles",
            "Dashboards", ["Examples", ["Phone", "Tablet", "Wall panel", "Phone, ungrouped footprints"], "Lovelace card", "Header", "Nav bar"],
            "Foundations", ["Design rules", "Palette", "Parts", "Color temperature", "Compact rows", "Worst case"],
            "Connected", [
              "Light", "Climate", "Sensor", "Weather", "Toggle", "Cover", "Alarm", "Humidifier", "Sound", "Owlet",
              // new-card: connected
            ],
          ],
          "Field", [
            "Cards", [
              "Light", "Climate", "Sensor", "Weather", "Toggle", "Humidifier", "Sound", "Cover", "Alarm", "Owlet",
              // new-card: cards
            ],
            "Dashboards", ["Examples", ["Phone", "Tablet", "Wall panel", "Wall panel, far", "Phone, alarm below the fold"], "Lovelace card", "Header", "Nav bar"],
            "Foundations", ["Design rules", "Palette", "Parts", "Alerts"],
            "Connected", [
              "Light", "Climate", "Sensor", "Weather", "Toggle", "Humidifier", "Sound", "Cover", "Alarm", "Owlet",
              // new-card: connected
            ],
          ],
          // new-skin: section order
        ],
      },
    },
  },
};

export default preview;
