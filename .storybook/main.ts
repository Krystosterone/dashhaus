import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  // The axe gate is the test runner's own pass over axe-playwright (.storybook/test-runner.ts), so the a11y addon
  // would only add its panel and a 650 kB axe bundle to every build.
  addons: ["@storybook/addon-docs"],
  features: { backgrounds: false, measure: false, outline: false },
  // Every page is MDX and draws its stories directly; no page uses a generated prop table, so react-docgen's transform
  // of every module would only be build time.
  typescript: { reactDocgen: false },
  framework: { name: "@storybook/react-vite", options: { builder: { viteConfigPath: "config/vite.config.ts" } } },
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // The workspace reads package source; a packed consumer reads the built dist (package.json exports).
  viteFinal: async (config) => {
    config.resolve ??= {};
    config.resolve.conditions = [...(config.resolve.conditions ?? []), "source"];
    // Storybook's preview and docs bundles hold the whole page's script, and its builder drops a Vite config file's
    // `build` block; split the chunks here, as Vite recommends, rather than shipping a monolithic iframe or blocks
    // chunk. Storybook's own output options (its woff2 externals) stay. One chunk remains over the limit: its
    // dist/preview/runtime.js is one prebundled module (1.5 MB, 808 kB minified), which no chunking can divide.
    config.build ??= {};
    config.build.rolldownOptions ??= {};
    const output = config.build.rolldownOptions.output;
    config.build.rolldownOptions.output = {
      ...(Array.isArray(output) ? output[0] : output),
      codeSplitting: { groups: [{ name: "vendor", test: /node_modules[\\/]/, maxSize: 450_000 }] },
    };
    return config;
  },
};

export default config;
