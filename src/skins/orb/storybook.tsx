import type { Decorator } from "@storybook/react";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import "./styles/tokens.css";
import { ORB_FONT_HREF, ORB_THEME_ATTRIBUTE } from "./shared/surface";

/** Accents to try. The default is tokens.css; the others only override --brand-c and --brand-h. */
const ACCENTS: Record<string, [number, number] | null> = {
  yellow: null,
  sage: [0.08, 150],
  coral: [0.12, 35],
  sky: [0.09, 235],
  lilac: [0.08, 300],
};

/**
 * The orb skin in Storybook: its section (every orb story's title starts with it), its toolbar, and a decorator
 * that applies the toolbar's theme (as data-orb-theme) and accent to <html> and puts the story on its clock's hour
 * cycle (`HourCycleProvider`, as a dashboard's header does); `fontHref` is Orb's typeface, which
 * .storybook/preview.tsx links for Orb's stories. .storybook/preview.tsx runs the decorator for orb stories
 * only and puts the dashboard surface on <body>.
 */
export const orbStorybook = {
  section: "Orb",
  surface: "ha-surface",
  fontHref: ORB_FONT_HREF,
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "auto", title: "Auto (system)" },
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    accent: {
      description: "The one accent (tokens.css --brand-c / --brand-h)",
      toolbar: {
        title: "Accent",
        icon: "paintbrush",
        items: [
          { value: "yellow", title: "Crextio yellow (default)" },
          { value: "sage", title: "Sage" },
          { value: "coral", title: "Coral" },
          { value: "sky", title: "Sky" },
          { value: "lilac", title: "Lilac" },
        ],
        dynamicTitle: true,
      },
    },
    orbClock: {
      description: "The dashboard's hour cycle (YAML hour_cycle): every time a card works out, and the header's clock",
      toolbar: {
        title: "Clock",
        icon: "time",
        items: [
          { value: "h23", title: "24-hour (default)" },
          { value: "h12", title: "12-hour" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "auto", accent: "yellow", orbClock: "h23" },
  decorator: ((Story, ctx) => {
    const theme = ctx.globals.theme as "auto" | "light" | "dark";
    const root = document.documentElement;
    if (theme === "auto") root.removeAttribute(ORB_THEME_ATTRIBUTE);
    else root.setAttribute(ORB_THEME_ATTRIBUTE, theme);
    const accent = ACCENTS[ctx.globals.accent as string] ?? null;
    if (accent) { root.style.setProperty("--brand-c", String(accent[0])); root.style.setProperty("--brand-h", String(accent[1])); }
    else { root.style.removeProperty("--brand-c"); root.style.removeProperty("--brand-h"); }
    // The seeds are written on 24 hours, so that is the default; a story on a 12-hour clock sets it (`orbClock`).
    return <HourCycleProvider hourCycle={ctx.globals.orbClock === "h12" ? "h12" : "h23"}><Story /></HourCycleProvider>;
  }) satisfies Decorator,
};
