import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** The bundled React and ReactDOM require their notice in every copy, including the deployed file. */
const notice = readFileSync("packages/bundle/THIRD_PARTY_NOTICES.md", "utf8").trim();

/** Fold every emitted stylesheet into the JS, where the card puts it in its shadow root. */
function inlineCss(): Plugin {
  return {
    name: "dashhaus-inline-css",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const sheets = Object.values(bundle).filter((file) => file.type === "asset" && file.fileName.endsWith(".css"));
      const css = sheets.map((sheet) => (sheet.type === "asset" ? String(sheet.source) : "")).join("\n");
      for (const sheet of sheets) delete bundle[sheet.fileName];
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        const replaced = chunk.code.replace(/(["'`])__DASHHAUS_CSS__\1/, () => JSON.stringify(css));
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

/** `npm run build:ha` — the Lovelace card as one self-contained ES module: dist/dashhaus.js. */
export default defineConfig({
  plugins: [react(), inlineCss()],
  resolve: { conditions: ["source"] },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __DASHHAUS_BUILD__: JSON.stringify(build),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    target: "es2022",
    lib: { entry: "apps/lovelace/entry.ts", formats: ["es"], fileName: () => "dashhaus.js" },
    rollupOptions: { output: { inlineDynamicImports: true, banner: `/*!\n${notice}\n*/` } },
  },
});
