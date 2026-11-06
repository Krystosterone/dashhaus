// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmsTxt from "starlight-llms-txt";
import { fileURLToPath } from "node:url";
import { entityGroups } from "./src/lib/groups.js";

const repo = "https://github.com/Krystosterone/dashhaus";

/**
 * The site reads the workspace's packages from source at build time, as Storybook and Vitest do (the `source` export
 * condition), so `src/lib/kinds.ts` can read the skins' own kind tables without a package build first. Vite's
 * defaults stay after it.
 */
const SOURCE = {
  name: "dashhaus:source",
  configEnvironment(_name, config) {
    const defaults = config.consumer === "client" ? ["module", "browser", "development|production"] : ["module", "node", "development|production"];
    config.resolve ??= {};
    config.resolve.conditions = ["source", ...(config.resolve.conditions ?? defaults)];
  },
};

// Served from GitHub Pages at krystosterone.github.io/dashhaus; `npm run build:docs` puts Storybook under /storybook.
// llms.txt, llms-small.txt and llms-full.txt carry the same pages for agents.
export default defineConfig({
  site: "https://krystosterone.github.io",
  base: "/dashhaus",
  vite: { plugins: [SOURCE] },
  integrations: [
    starlight({
      title: "Dashhaus",
      description: "Two finished dashboards for Home Assistant, Orb and Field, installed from the Marketplace, and the headless hooks under them to draw your own.",
      social: [{ icon: "github", label: "GitHub", href: repo }],
      editLink: { baseUrl: `${repo}/edit/main/docs/` },
      customCss: ["./src/styles/theme.css"],
      // Code frames sit on their own tone, with no outline, like the rest of the site's surfaces.
      expressiveCode: { styleOverrides: { borderWidth: "0px" } },
      // The home page's hero draws both skins live; every other page keeps Starlight's.
      components: { Hero: "./src/components/home/Hero.astro" },
      // Libre Franklin sets the site's headings (theme.css); body text stays in the system face.
      head: [
        { tag: "link", attrs: { rel: "preconnect", href: "https://fonts.googleapis.com" } },
        { tag: "link", attrs: { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: true } },
        {
          tag: "link",
          attrs: { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@500;700&display=swap" },
        },
      ],
      // An agent that fetches only llms.txt still gets the task most people bring, installing a skin, and the next, building one.
      plugins: [
        starlightLlmsTxt({
          description: "Home Assistant dashboards drawn in React: two finished skins, Orb and Field, installed from the Marketplace, and headless hooks to draw your own.",
          details: [
            "Dashhaus is in beta (0.x versions; 1.0 will be the first stable release): a new 0.x version may break YAML keys, hooks or a card's look, so read a release's notes before updating, keep every @dashhaus/ package on one version, and report how it went at https://github.com/Krystosterone/dashhaus/issues.",
            "",
            "To install Orb and Field in a Home Assistant, with no terminal, as an administrator:",
            "1. Open https://my.home-assistant.io/redirect/hacs_repository/?owner=Krystosterone&repository=dashhaus&category=plugin and download Dashhaus (a Dashboard; add it as a custom repository if asked). Home Assistant 2026.11+ opens the Marketplace; older versions need HACS.",
            "2. Reload the browser tab.",
            "3. Settings → Dashboards → Add dashboard → under Community dashboards, pick \"Dashhaus\" → Create (Home Assistant 2026.5+; on an older one, give a new dashboard `strategy: { type: custom:dashhaus }` as its configuration).",
            "4. Open the new Dashhaus dashboard from the sidebar: a tab for each look, Orb and Field, laid out from the house. It never changes an existing dashboard.",
            "",
            "To build someone their own skin (a whole look for their dashboards) from a picture or a description: run `npm create dashhaus-skin@latest <name>`, follow the AGENTS.md it writes (restyle, `npm test`, `npm run snapshot` to show them), then `npm run deploy` with HA_URL, HA_TOKEN and HA_WWW in .env. An agent that can't reach their Home Assistant (one in the cloud) follows the AGENTS.md's Install by hand instead: it hands over the built file and walks them through File editor, Resources and a new dashboard, with no token. start/build-a-skin has the prompt and the Home Assistant steps for a person with no terminal experience.",
            "",
            "The four ways in: install a skin (start/install), build a skin (start/build-a-skin), use the hooks in your own React app (start/getting-started), contribute to the repository (develop/monorepo).",
          ].join("\n"),
        }),
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Introduction", slug: "intro" },
            { label: "Why Dashhaus", slug: "why" },
            { label: "Packages", slug: "packages" },
          ],
        },
        {
          label: "Install a skin",
          items: [
            { label: "Install from the Marketplace", slug: "start/install" },
            { label: "Lay it out in YAML", slug: "start/yaml" },
            { label: "Orb and Field", slug: "skins" },
            { label: "Warnings and alarms", slug: "start/warnings" },
            { label: "Deploy from the command line", slug: "start/deploy" },
          ],
        },
        { label: "Build a skin", items: [{ label: "Build a skin", slug: "start/build-a-skin" }] },
        {
          label: "Use the hooks",
          items: [
            { label: "Your first control", slug: "start/getting-started" },
            {
              label: "Entities",
              items: [
                { label: "Overview", slug: "entities" },
                ...entityGroups(fileURLToPath(new URL("./src/content/docs/entities", import.meta.url))),
              ],
            },
            {
              label: "Advanced hooks",
              items: [
                { label: "Hooks reference", slug: "hooks" },
                { label: "Raw state and selectors", slug: "hooks/state" },
                { label: "Areas, history and requests", slug: "hooks/areas-history" },
                { label: "Interaction primitives", slug: "hooks/primitives" },
              ],
            },
            {
              label: "Errors and connection status",
              items: [
                { label: "Connection status", slug: "errors/connection" },
                { label: "Action errors", slug: "errors/actions" },
                { label: "Connecting and auth", slug: "errors/auth" },
              ],
            },
            { label: "Testing and demo data", slug: "develop/testing" },
          ],
        },
        {
          label: "Contribute",
          items: [
            { label: "Repository and commands", slug: "develop/monorepo" },
            { label: "Add a card or a skin", slug: "develop/cards-and-skins" },
            { label: "Studies", slug: "develop/studies" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Release notes", slug: "releases" },
            { label: "Storybook", link: "/storybook/", attrs: { target: "_blank" } },
            { label: "Specification", link: `${repo}/tree/main/spec`, attrs: { target: "_blank" } },
          ],
        },
      ],
    }),
  ],
});
