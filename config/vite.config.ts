import { defaultClientConditions, defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Vite's conditions replace its defaults rather than adding to them, so they are named again beside the source one.
  resolve: { conditions: ["source", ...defaultClientConditions] },
});
