import { spawnSync } from "node:child_process";

// The dashboard `npm run deploy` creates: it builds dist/dashhaus-__skin__.js, uploads it to Home Assistant,
// registers it and creates the dashboard the first time. Settings live in .env beside this file (.env.example).

// The title the card prints in its header, as the preview does; also the name of the dashboard's one view.
const PAGE_TITLE = "Home";

export default {
  pageTitle: PAGE_TITLE,
  bundle: "dist/dashhaus-__skin__.js",
  async build() {
    const result = spawnSync("npm", ["run", "build", "--silent"], { stdio: "inherit", shell: process.platform === "win32" });
    if (result.status !== 0) throw new Error("npm run build failed");
  },
  dashboards: [
    {
      path: "dashhaus-__skin__",
      title: "Home (__Section__)",
      icon: "mdi:view-dashboard-outline",
      async card() {
        // No `cards` or `rows`: the card lays out every light and sensor, a row per area, each time it draws.
        return { card: { type: "custom:__card_type__", title: PAGE_TITLE }, made: "automatic" };
      },
    },
  ],
};
