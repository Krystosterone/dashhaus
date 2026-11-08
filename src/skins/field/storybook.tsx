import type { Decorator } from "@storybook/react";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import "./styles/tokens.css";
import { FIELD_FONT_HREF } from "./shared/surface";

/**
 * The field skin in Storybook: its section (every field story's title starts with it), its Finish and Clock toolbar,
 * and a decorator that applies the finish to <html> and puts the story on the clock's hour cycle
 * (`HourCycleProvider`, as a dashboard's header does); `fontHref` is Field's typeface, which .storybook/preview.tsx links
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
    fieldClock: {
      description: "The dashboard's hour cycle (YAML hour_cycle): every time a module works out, and the header's clock",
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
  initialGlobals: { finish: "auto", fieldClock: "h23" },
  decorator: ((Story, ctx) => {
    const finish = ctx.globals.finish as "auto" | "alloy" | "black";
    const root = document.documentElement;
    if (finish === "auto") root.removeAttribute("data-fd-finish");
    else root.setAttribute("data-fd-finish", finish);
    // The seeds are written on 24 hours, so that is the default; a story on a 12-hour clock sets it (`fieldClock`).
    return <HourCycleProvider hourCycle={ctx.globals.fieldClock === "h12" ? "h12" : "h23"}><Story /></HourCycleProvider>;
  }) satisfies Decorator,
};
