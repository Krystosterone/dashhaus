import type { Decorator } from "@storybook/react";
import "./styles/tokens.css";
import { TITAN_FONT_HREF, TITAN_THEME_ATTRIBUTE } from "./shared/surface";

/**
 * Storybook setup owned by the Titan skin: its section, the class its surface puts on <body>, its theme toolbar
 * and a decorator that puts the chosen theme on <html> as data-titan-theme (Auto leaves the system's scheme).
 * `fontHref` is the skin's web font; .storybook/preview.tsx links it for this skin's stories.
 */
export const titanStorybook = {
  section: "Studies/Titan",
  surface: "titan-surface",
  fontHref: TITAN_FONT_HREF,
  globalTypes: {
    titanTheme: {
      description: "Titan theme (Titan skin only)",
      toolbar: {
        title: "Theme",
        icon: "contrast",
        items: [
          { value: "auto", title: "Auto (system)" },
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { titanTheme: "auto" },
  decorator: ((Story, ctx) => {
    const theme = ctx.globals.titanTheme as "auto" | "light" | "dark" | undefined;
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") root.setAttribute(TITAN_THEME_ATTRIBUTE, theme);
    else root.removeAttribute(TITAN_THEME_ATTRIBUTE);
    return <Story />;
  }) satisfies Decorator,
};
