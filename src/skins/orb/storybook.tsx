import type { Decorator } from "@storybook/react";
import "./styles/tokens.css";

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
 * that applies the toolbar's theme and accent to <html> and the dashboard surface to <body>. .storybook/preview.tsx
 * runs the decorator for orb stories only.
 */
export const orbStorybook = {
  section: "Orb",
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
    if (theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    const accent = ACCENTS[ctx.globals.accent as string] ?? null;
    if (accent) { root.style.setProperty("--brand-c", String(accent[0])); root.style.setProperty("--brand-h", String(accent[1])); }
    else { root.style.removeProperty("--brand-c"); root.style.removeProperty("--brand-h"); }
    document.body.classList.add("ha-surface");
    return <Story />;
  }) satisfies Decorator,
};
