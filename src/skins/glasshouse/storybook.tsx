import type { Decorator } from "@storybook/react";
import "./styles/tokens.css";
import { GLASSHOUSE_FONT_HREF, GLASSHOUSE_THEME_ATTRIBUTE } from "./shared/surface";

/**
 * Storybook setup owned by the Glasshouse skin: its section, the class its surface puts on <body>, its theme toolbar
 * and a decorator that puts the chosen theme on <html> as data-glasshouse-theme (Auto leaves the system's scheme).
 * `fontHref` is the skin's web font; .storybook/preview.tsx links it for this skin's stories.
 */
export const glasshouseStorybook = {
  section: "Studies/Glasshouse",
  surface: "glasshouse-surface",
  fontHref: GLASSHOUSE_FONT_HREF,
  globalTypes: {
    glasshouseTheme: {
      description: "Glasshouse theme (Glasshouse skin only)",
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
  initialGlobals: { glasshouseTheme: "auto" },
  decorator: ((Story, ctx) => {
    const theme = ctx.globals.glasshouseTheme as "auto" | "light" | "dark" | undefined;
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") root.setAttribute(GLASSHOUSE_THEME_ATTRIBUTE, theme);
    else root.removeAttribute(GLASSHOUSE_THEME_ATTRIBUTE);
    return <Story />;
  }) satisfies Decorator,
};
