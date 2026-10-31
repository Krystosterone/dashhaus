import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: [{ name: "@storybook/addon-essentials", options: { backgrounds: false, measure: false, outline: false } }, "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: { builder: { viteConfigPath: "config/vite.config.ts" } } },
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // The workspace reads package source; a packed consumer reads the built dist (package.json exports).
  viteFinal: async (config) => {
    config.resolve ??= {};
    config.resolve.conditions = [...(config.resolve.conditions ?? []), "source"];
    return config;
  },
};

export default config;
