---
type: fix
---
A new skin from create-dashhaus-skin builds without Vite 8's "inlineDynamicImports option is deprecated" warning. A skin made with 0.4.0 keeps printing it until you replace rollupOptions: { output: { inlineDynamicImports: true } } with rolldownOptions: { output: { codeSplitting: false } } in its vite.config.js; the built file is the same either way.
