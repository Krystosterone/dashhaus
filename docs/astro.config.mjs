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
      description: "Home Assistant dashboards drawn in React, with two skins and room for your own.",
      social: [{ icon: "github", label: "GitHub", href: repo }],
      editLink: { baseUrl: `${repo}/edit/main/docs/` },
      customCss: ["./src/styles/theme.css"],
      plugins: [starlightLlmsTxt()],
      sidebar: [
        { label: "Start here", items: [{ label: "Deploy a dashboard", slug: "start/deploy" }, { label: "Build a skin", slug: "start/build-a-skin" }] },
        { label: "Skins", items: [{ label: "Orb and Field", slug: "skins" }] },
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
