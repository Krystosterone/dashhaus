import type { Decorator } from "@storybook/react";
import "./styles/tokens.css";
import { LCARS_FONT_HREF, LCARS_THEME_ATTRIBUTE } from "./shared/surface";

/**
 * Storybook setup owned by the Lcars skin: its section, the class its surface puts on <body>, its theme toolbar
 * and a decorator that puts the chosen theme on <html> as data-lcars-theme (Auto leaves the system's scheme).
 * `fontHref` is the skin's web font; .storybook/preview.tsx links it for this skin's stories.
 */
export const lcarsStorybook = {
  section: "Studies/Lcars",
  surface: "lcars-surface",
  fontHref: LCARS_FONT_HREF,
  globalTypes: {
    lcarsTheme: {
      description: "Lcars theme (Lcars skin only)",
      toolbar: {
        title: "Lcars theme",
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
  initialGlobals: { lcarsTheme: "auto" },
  decorator: ((Story, ctx) => {
    const theme = ctx.globals.lcarsTheme as "auto" | "light" | "dark" | undefined;
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") root.setAttribute(LCARS_THEME_ATTRIBUTE, theme);
    else root.removeAttribute(LCARS_THEME_ATTRIBUTE);
    return <Story />;
  }) satisfies Decorator,
};
