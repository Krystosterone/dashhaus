import type { Decorator } from "@storybook/react";
import "./styles/tokens.css";
import { __SKIN_CONST___FONT_HREF, __SKIN_CONST___THEME_ATTRIBUTE } from "./shared/surface";

/**
 * Storybook setup owned by the __Section__ skin: its section, the class its surface puts on <body>, its theme toolbar
 * and a decorator that puts the chosen theme on <html> as data-__skin__-theme (Auto leaves the system's scheme).
 * `fontHref` is the skin's web font; .storybook/preview.tsx links it for this skin's stories.
 */
export const __skinVar__Storybook = {
  section: "__Section__",
  surface: "__skin__-surface",
  fontHref: __SKIN_CONST___FONT_HREF,
  globalTypes: {
    __skinVar__Theme: {
      description: "__Section__ theme (__Section__ skin only)",
      toolbar: {
        title: "__Section__ theme",
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
  initialGlobals: { __skinVar__Theme: "auto" },
  decorator: ((Story, ctx) => {
    const theme = ctx.globals.__skinVar__Theme as "auto" | "light" | "dark" | undefined;
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") root.setAttribute(__SKIN_CONST___THEME_ATTRIBUTE, theme);
    else root.removeAttribute(__SKIN_CONST___THEME_ATTRIBUTE);
    return <Story />;
  }) satisfies Decorator,
};
