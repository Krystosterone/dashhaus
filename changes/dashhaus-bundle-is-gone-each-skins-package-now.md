---
type: breaking
---
@dashhaus/bundle is gone: each skin's package now ships its own file. To deploy from the command line, install @dashhaus/orb or @dashhaus/field (or both) with @dashhaus/deploy instead of @dashhaus/bundle, and in dashboard.config.mjs replace bundle: fileURLToPath(bundlePath) with files: [resourceFile], importing resourceFile from @dashhaus/orb/resource or @dashhaus/field/resource. Your dashboards keep working. After the first deploy, delete the old /local/dashhaus/dashhaus.js under Settings → Dashboards → Resources, since it defines the same cards.
