import type { Decorator } from "@storybook/react";
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
 * that applies the toolbar's theme (as data-orb-theme) and accent to <html>; `fontHref` is Orb's typeface, which
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
  },
  initialGlobals: { theme: "auto", accent: "yellow" },
  decorator: ((Story, ctx) => {
    const theme = ctx.globals.theme as "auto" | "light" | "dark";
    const root = document.documentElement;
    if (theme === "auto") root.removeAttribute(ORB_THEME_ATTRIBUTE);
    else root.setAttribute(ORB_THEME_ATTRIBUTE, theme);
    const accent = ACCENTS[ctx.globals.accent as string] ?? null;
    if (accent) { root.style.setProperty("--brand-c", String(accent[0])); root.style.setProperty("--brand-h", String(accent[1])); }
    else { root.style.removeProperty("--brand-c"); root.style.removeProperty("--brand-h"); }
    return <Story />;
  }) satisfies Decorator,
};
