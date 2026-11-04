import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * A component's own `import "./Card.css"` adds nothing here: inside Home Assistant the card draws in a shadow root,
 * which a page stylesheet can't reach. `lovelace/entry.tsx` gathers every stylesheet `?inline` and hands them to the
 * card instead, the same way in the preview and in the build. The empty module's id ends in `.js`, not `.css`, so
 * Vite's CSS pipeline leaves it alone: one that read as a stylesheet was parsed as CSS and written out as an empty
 * `dist/style.css` beside the one file.
 */
function stylesInShadowRoot() {
  return {
    name: "dashhaus-styles-in-shadow-root",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || !/\.css$/.test(source) || importer.includes("node_modules")) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved ? `\0dashhaus-style:${resolved.id}.js` : null;
    },
    load(id) {
      return id.startsWith("\0dashhaus-style:") ? "export {};" : null;
    },
  };
}

/** One ES module, one file: the Lovelace resource needs no second file. */
export default defineConfig({
  plugins: [stylesInShadowRoot(), react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    lib: { entry: "lovelace/entry.tsx", formats: ["es"], fileName: () => "dashhaus-__skin__.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
