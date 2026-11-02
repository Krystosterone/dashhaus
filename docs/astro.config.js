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
      description: "Home Assistant dashboards drawn in React: headless hooks for every entity, two skins, and room for your own.",
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
      plugins: [starlightLlmsTxt()],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Introduction", slug: "intro" },
            { label: "Why Dashhaus", slug: "why" },
            { label: "Getting started", slug: "start/getting-started" },
            { label: "Packages", slug: "packages" },
          ],
        },
        {
          label: "Use a skin",
          items: [
            { label: "Deploy a dashboard", slug: "start/deploy" },
            { label: "Lay it out in YAML", slug: "start/yaml" },
            { label: "Orb and Field", slug: "skins" },
          ],
        },
        { label: "Build a skin", items: [{ label: "Build a skin", slug: "start/build-a-skin" }] },
        {
          label: "Entities",
          items: [
            { label: "Overview", slug: "entities" },
            { label: "Controls", items: ["entities/light", "entities/toggle", "entities/cover", "entities/sound"] },
            { label: "Comfort", items: ["entities/climate", "entities/humidifier"] },
            { label: "Readings", items: ["entities/sensor", "entities/weather"] },
            { label: "Safety", items: ["entities/alarm", "entities/owlet"] },
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
        {
          label: "Development and testing",
          items: [
            { label: "Testing and demo data", slug: "develop/testing" },
            {
              label: "Develop in the monorepo",
              items: [
                { label: "Repository and commands", slug: "develop/monorepo" },
                { label: "Add a card or a skin", slug: "develop/cards-and-skins" },
              ],
            },
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
