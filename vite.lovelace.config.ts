import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Fold every emitted stylesheet into the JS, where the card puts it in its shadow root. */
function inlineCss(): Plugin {
  return {
    name: "home-dashboard-inline-css",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const sheets = Object.values(bundle).filter((file) => file.type === "asset" && file.fileName.endsWith(".css"));
      const css = sheets.map((sheet) => (sheet.type === "asset" ? String(sheet.source) : "")).join("\n");
      for (const sheet of sheets) delete bundle[sheet.fileName];
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        const replaced = chunk.code.replace(/(["'`])__HOME_DASHBOARD_CSS__\1/, () => JSON.stringify(css));
        if (replaced === chunk.code && chunk.isEntry) this.error("The CSS placeholder is missing from the entry chunk.");
        chunk.code = replaced;
      }
    },
  };
}

const build = (() => {
  try {
    return execSync("git describe --always --dirty", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
})();

/** `npm run build:ha` — the Lovelace card as one self-contained ES module: dist/home-dashboard.js. */
export default defineConfig({
  plugins: [react(), inlineCss()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __HOME_DASHBOARD_BUILD__: JSON.stringify(build),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    target: "es2022",
    lib: { entry: "src/ha/lovelace/entry.ts", formats: ["es"], fileName: () => "home-dashboard.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
