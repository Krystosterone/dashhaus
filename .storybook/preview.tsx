import type { Decorator, Loader, Preview } from "@storybook/react";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import { orbStorybook } from "@dashhaus/orb/storybook";
import { fieldStorybook } from "@dashhaus/field/storybook";
import { futuraStorybook } from "@dashhaus/futura/storybook";
import { glasshouseStorybook } from "@dashhaus/glasshouse/storybook";
import { titanStorybook } from "@dashhaus/titan/storybook";
// new-skin: storybook imports

/**
 * What a skin's Storybook setup declares (src/skins/<skin>/storybook.tsx): a section its story titles start with, its
 * toolbar, the class its page surface puts on <body>, a decorator and, optionally, its web font's stylesheet URL.
 */
interface SkinStorybook {
  section: string;
  surface: string;
  /** Its web font's stylesheet, linked from <head> as its Lovelace card links it; its faces load before the story renders. */
  fontHref?: string;
  globalTypes: Preview["globalTypes"];
  initialGlobals: Preview["initialGlobals"];
  decorator: Decorator;
}

/**
 * Every skin brings its own Storybook setup. A new skin adds itself here, and its section to storySort below; its
 * decorator, surface and font apply to its stories only.
 */
const SKINS: SkinStorybook[] = [
  orbStorybook,
  fieldStorybook,
  futuraStorybook,
  glasshouseStorybook,
  titanStorybook,
  // new-skin: storybook setups
];

const skinOf = (title: string) => SKINS.find((s) => title.startsWith(`${s.section}/`));

/** How long a story waits for its skin's font before it renders with the fallback stack (no network, a slow CDN). */
const FONT_WAIT_MS = 4000;
const fonts = new Map<string, Promise<void>>();

/** The families a Google Fonts stylesheet URL asks for (`family=Barlow:wght@400&family=JetBrains+Mono…`). */
const familiesOf = (href: string) => new URL(href).searchParams.getAll("family").map((family) => family.split(":")[0].replace(/\+/g, " "));

/**
 * The skin's font stylesheet, linked once, and every face of its families loaded: a story's first paint, a screenshot
 * and an axe pass all see the real type, in every skin. A stylesheet whose URL
 * names no family waits for `document.fonts.ready` instead. Settles, never throws; after FONT_WAIT_MS the story renders
 * anyway, on the fallback stack.
 */
function loadFont(href: string): Promise<void> {
  let loading = fonts.get(href);
  if (!loading) {
    loading = new Promise<void>((settle) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => {
        const families = new Set(familiesOf(href));
        const faces = [...document.fonts].filter((face) => families.has(face.family.replace(/["']/g, "")));
        const loaded = families.size ? Promise.allSettled(faces.map((face) => face.load())) : document.fonts.ready;
        void loaded.then(() => settle(), () => settle());
      };
      link.onerror = () => settle();
      document.head.append(link);
    });
    fonts.set(href, loading);
  }
  return Promise.race([loading, new Promise<void>((settle) => setTimeout(settle, FONT_WAIT_MS))]);
}

/** Loads the story's skin font before it renders. */
const withSkinFont: Loader = async (ctx) => {
  const href = skinOf(ctx.title)?.fontHref;
  if (href) await loadFont(href);
  return {};
};

/**
 * Every story starts on 24 hours, the clock the seeds are written on, whatever the browser's locale, so a card's own
 * times and the times its seed brings agree; a 12-hour story sets its own (`HourCycleProvider` in its decorators, over
 * `onHourCycle` seeds), so no story is ever on two clocks.
 */
const withSkin: Decorator = (Story, ctx) => {
  const skin = skinOf(ctx.title);
  for (const s of SKINS) document.body.classList.toggle(s.surface, s === skin);
  return <HourCycleProvider hourCycle="h23">{skin ? skin.decorator(Story, ctx) : <Story />}</HourCycleProvider>;
};

/**
 * Every skin's globals, each stamped with its skin's section: .storybook/manager.tsx draws a story's toolbar from its
 * own skin's globals only. Storybook draws a menu for every global with a `toolbar`, on every story, so each skin's
 * toolbar is handed over as `skinToolbar` instead, which only the manager reads.
 */
const globalTypes: Preview["globalTypes"] = Object.fromEntries(
  SKINS.flatMap((s) =>
    Object.entries(s.globalTypes ?? {}).map(([id, { toolbar, ...type }]) => [id, { ...type, section: s.section, skinToolbar: toolbar }]),
  ),
);

const preview: Preview = {
  globalTypes,
  initialGlobals: Object.assign({}, ...SKINS.map((s) => s.initialGlobals)),
  decorators: [withSkin],
  loaders: [withSkinFont],
  parameters: {
    backgrounds: { disable: true },
    // The a11y addon runs axe after every render unless told not to; the gate is the test runner's own axe pass
    // (.storybook/test-runner.ts), so the addon runs only when its panel's button is pressed, and a story is checked once.
    a11y: { test: "off" },
    controls: { expanded: true },
    // Storybook reads this statically, so it must stay a literal: one section per skin, then its own order.
    options: {
      storySort: {
        // Every skin has the same groups in the same order, Bundles in orb only (AGENTS.md → Storybook; verify/storybook.test.ts checks).
        order: [
          "Orb", [
            "Cards", [
              "Light", "Climate", "Sensor", "Weather", "Toggle", "Cover", "Alarm", "Humidifier", "Sound", "Owlet", "Lock",
              // new-card: cards
            ],
            "Bundles",
            "Dashboards", ["Examples", ["Phone", "Tablet", "Wall panel", "Phone, ungrouped footprints"], "Lovelace card", "Header", "Nav bar"],
            "Foundations", ["Design rules", "Palette", "Parts", "Color temperature", "Compact rows", "Worst case"],
            "Connected", [
              "Light", "Climate", "Sensor", "Weather", "Toggle", "Cover", "Alarm", "Humidifier", "Sound", "Owlet", "Lock",
              // new-card: connected
            ],
          ],
          "Field", [
            "Cards", [
              "Light", "Climate", "Sensor", "Weather", "Toggle", "Humidifier", "Sound", "Cover", "Alarm", "Owlet", "Lock",
              "Fan",
              "GuestWifi",
              "BinarySensor",
              "Camera",
              "MediaPlayer",
              "Numeric",
              "Vacuum",
              "Calendar",
              "Sun",
              // new-card: cards
            ],
            "Dashboards", ["Examples", ["Phone", "Tablet", "Wall panel", "Wall panel, far", "Phone, alarm below the fold"], "Lovelace card", "Header", "Nav bar"],
            "Foundations", ["Design rules", "Palette", "Parts", "Alerts"],
            "Connected", [
              "Light", "Climate", "Sensor", "Weather", "Toggle", "Humidifier", "Sound", "Cover", "Alarm", "Owlet", "Lock",
              "Fan",
              "GuestWifi",
              "BinarySensor",
              "Camera",
              "MediaPlayer",
              "Numeric",
              "Vacuum",
              "Calendar",
              "Sun",
              // new-card: connected
            ],
          ],
          // new-skin: section order
          // Studies (spec/skins.md → Studies): skins an agent built with the generators, kept to learn from. Each has
          // the usual groups after its Read me first page.
          "Studies", [
            "Futura", [
              "Read me first",
              "Cards", [
                "Light",
                "Climate",
                "Toggle",
                "Sensor",
                "Weather",
                // new-card: cards
              ],
              "Dashboards", ["Examples", "Lovelace card", "Header", "Nav bar"],
              "Foundations", ["Design rules", "Palette", "Parts"],
              "Connected", [
                "Light",
                "Climate",
                "Toggle",
                "Sensor",
                "Weather",
                // new-card: connected
              ],
            ],
            "Glasshouse", [
              "Read me first",
              "Cards", [
                "Climate",
                "Light",
                "Lock",
                "Sensor",
                "Toggle",
                "Weather",
                // new-card: cards
              ],
              "Dashboards", ["Examples", "Lovelace card", "Header", "Nav bar"],
              "Foundations", ["Design rules", "Palette", "Parts"],
              "Connected", [
                "Climate",
                "Light",
                "Lock",
                "Sensor",
                "Toggle",
                "Weather",
                // new-card: connected
              ],
            ],
            "Titan", [
              "Read me first",
              "Cards", [
                "Climate",
                "Light",
                "Lock",
                "Sensor",
                "Toggle",
                "Weather",
                // new-card: cards
              ],
              "Dashboards", ["Examples", "Lovelace card", "Header", "Nav bar"],
              "Foundations", ["Design rules", "Palette", "Parts"],
              "Connected", [
                "Climate",
                "Light",
                "Lock",
                "Sensor",
                "Toggle",
                "Weather",
                // new-card: connected
              ],
            ],
            // new-skin: study order
          ],
        ],
      },
    },
  },
};

export default preview;
