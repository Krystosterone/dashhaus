import type { Decorator } from "@storybook/react";
import "./styles/tokens.css";

/**
 * Storybook setup owned by the Futura skin: its section, its Theme toolbar and a decorator that puts the chosen
 * theme on <html> as data-futura-theme. The console (dark) is Futura's own default, whatever the system says;
 * Daylight is the light values Home Assistant's light theme gets. The attribute is Futura's own, so another skin's
 * toolbar never re-colours it.
 */
export const futuraStorybook = {
  section: "Futura",
  surface: "futura-surface",
  globalTypes: {
    futuraTheme: {
      description: "Futura theme (futura skin only)",
      toolbar: {
        title: "Futura theme",
        icon: "contrast",
        items: [
          { value: "console", title: "Console (dark)" },
          { value: "daylight", title: "Daylight (light)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { futuraTheme: "console" },
  decorator: ((Story, ctx) => {
    const root = document.documentElement;
    if (ctx.globals.futuraTheme === "daylight") root.setAttribute("data-futura-theme", "light");
    else root.removeAttribute("data-futura-theme");
    return <Story />;
  }) satisfies Decorator,
};
