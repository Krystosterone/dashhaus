import { readFileSync } from "node:fs";
import { defaultClientConditions, defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { NOTICE, resource } from "../scripts/resources.js";

/**
 * Which resource this build writes (scripts/resources.js): `DASHHAUS_RESOURCE=orb` for Orb's `orb-dashboard.js`, and so
 * on. `scripts/build-resources.js` sets it for each build; left unset, the combined `dashhaus.js`.
 */
const target = resource(process.env.DASHHAUS_RESOURCE || "dashhaus");

/** The bundled React and ReactDOM require their notice in every copy, including the deployed file. */
const notice = readFileSync(NOTICE, "utf8").trim();

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

/**
 * The build's name in its console line: its package's version, from the files alone. Never a ref (`git describe`, a tag,
 * `-dirty`), so the same tree builds the same bytes before and after it is tagged, and the files a release PR records
 * are the files the Release workflow ships (spec/release.md → Determinism). A deploy is told apart by its content hash.
 */
const build = (JSON.parse(readFileSync(`${target.version}/package.json`, "utf8")) as { version: string }).version;

/** `npm run build:ha` — one resource as one self-contained ES module: dist/<file>. */
export default defineConfig({
  plugins: [react(), inlineCss()],
  resolve: { conditions: ["source", ...defaultClientConditions] },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __DASHHAUS_BUILD__: JSON.stringify(build),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    target: "es2022",
    lib: { entry: target.entry, formats: ["es"], fileName: () => target.file },
    // `comments.legal` keeps React's own `@license` headers, which Vite drops from a minified build unless asked.
    rolldownOptions: { output: { codeSplitting: false, comments: { legal: true }, banner: `/*!\n${notice}\n*/` } },
  },
});
