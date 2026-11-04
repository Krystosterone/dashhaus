// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmsTxt from "starlight-llms-txt";

const repo = "https://github.com/Krystosterone/dashhaus";

// Served from GitHub Pages at krystosterone.github.io/dashhaus; `npm run build:docs` puts Storybook under /storybook.
// llms.txt, llms-small.txt and llms-full.txt carry the same pages for agents.
export default defineConfig({
  site: "https://krystosterone.github.io",
  base: "/dashhaus",
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
      // An agent that fetches only llms.txt still gets the one task most people bring: installing a skin.
      plugins: [
        starlightLlmsTxt({
          description: "Home Assistant dashboards drawn in React: two finished skins, Orb and Field, installed from the Marketplace, and headless hooks to draw your own.",
          details: [
            "To install Orb and Field in a Home Assistant, with no terminal, as an administrator:",
            "1. Open https://my.home-assistant.io/redirect/hacs_repository/?owner=Krystosterone&repository=dashhaus&category=plugin and download Dashhaus (a Dashboard; add it as a custom repository if asked). Home Assistant 2026.11+ opens the Marketplace; older versions need HACS.",
            "2. Reload the browser tab.",
            "3. Overview → ⋮ → Edit dashboard → Add card → \"Dashhaus setup\" → Save, then press \"Create dashboards\".",
            "4. Open \"Home (Orb)\" and \"Home (Field)\" from its links, then remove the setup card. It never changes an existing dashboard.",
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
                { label: "Controls", items: ["entities/light", "entities/toggle", "entities/cover", "entities/sound"] },
                { label: "Comfort", items: ["entities/climate", "entities/humidifier", "entities/fan"] },
                { label: "Readings", items: ["entities/sensor", "entities/weather"] },
                { label: "Safety", items: ["entities/alarm", "entities/lock", "entities/owlet"] },
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
            { label: "Storybook", link: "/storybook/", attrs: { target: "_blank" } },
            { label: "Specification", link: `${repo}/tree/main/spec`, attrs: { target: "_blank" } },
          ],
        },
      ],
    }),
  ],
});
