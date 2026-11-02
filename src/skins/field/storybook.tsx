import type { Decorator } from "@storybook/react";
import "./styles/tokens.css";
import { FIELD_FONT_HREF } from "./shared/surface";

/**
 * The field skin in Storybook: its section (every field story's title starts with it), its Finish toolbar, and a
 * decorator that applies the finish to <html>; `fontHref` is Field's typeface, which .storybook/preview.tsx links
 * for Field's stories. .storybook/preview.tsx runs the decorator for field stories only
 * and puts its surface class on <body>.
 */
export const fieldStorybook = {
  section: "Field",
  surface: "fd-surface",
  fontHref: FIELD_FONT_HREF,
  globalTypes: {
    finish: {
      description: "Field finish (field skin only)",
      toolbar: {
        title: "Finish",
        icon: "contrast",
        items: [
          { value: "auto", title: "Auto (system)" },
          { value: "alloy", title: "Alloy" },
          { value: "black", title: "Black" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { finish: "auto" },
  decorator: ((Story, ctx) => {
    const finish = ctx.globals.finish as "auto" | "alloy" | "black";
    const root = document.documentElement;
    if (finish === "auto") root.removeAttribute("data-fd-finish");
    else root.setAttribute("data-fd-finish", finish);
    return <Story />;
  }) satisfies Decorator,
};
