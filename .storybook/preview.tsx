import type { Decorator, Preview } from "@storybook/react";
import "../src/styles/tokens.css";

/** Applies the toolbar theme to <html> and the dashboard surface to <body>. */
const withTheme: Decorator = (Story, ctx) => {
  const theme = ctx.globals.theme as "auto" | "light" | "dark";
  const root = document.documentElement;
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  document.body.classList.add("ha-surface");
  return <Story />;
};

const preview: Preview = {
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
  },
  initialGlobals: { theme: "auto" },
  decorators: [withTheme],
  parameters: {
    backgrounds: { disable: true },
    controls: { expanded: true },
    options: { storySort: { order: ["Widgets", ["Header", "Light", "Climate", "Sensor", "Home", "Toggle"], "Dashboards", ["Phone", "Phone, mixed sizes", "Tablet", "Wall panel"], "Foundations"] } },
  },
};

export default preview;
