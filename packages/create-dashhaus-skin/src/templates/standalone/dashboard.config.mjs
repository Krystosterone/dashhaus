import { spawnSync } from "node:child_process";

// The dashboard `npm run deploy` creates: it builds dist/dashhaus-__skin__.js, uploads it to Home Assistant,
// registers it and creates the dashboard the first time. Settings live in .env beside this file (.env.example).
export default {
  pageTitle: "Home",
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
        // No `cards`: the card lays out every light and sensor by area, each time it draws.
        return { card: { type: "custom:__card_type__" }, made: "automatic" };
      },
    },
  ],
};
