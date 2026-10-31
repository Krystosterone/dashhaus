import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The short author build: one ES module, one file. The entry imports its CSS with `?inline`, so the bundle carries the
 * stylesheet itself and the Lovelace resource needs no second file.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    lib: { entry: "skin/lovelace/entry.tsx", formats: ["es"], fileName: () => "dashhaus.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
