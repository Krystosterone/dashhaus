import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * One ES module, one file: the entry imports its stylesheets with `?inline`, so the Lovelace resource needs no
 * second file and the card puts the CSS in its shadow root itself.
 */
export default defineConfig({
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    lib: { entry: "lovelace/entry.tsx", formats: ["es"], fileName: () => "dashhaus.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
