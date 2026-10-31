/**
 * Build the publishable packages' ESM JavaScript and declarations into each package's `dist/`.
 *
 * The workspace consumes the packages' source through the `source` export condition, so this output exists only for
 * packed/published installs. `tsc` keeps the source tree's shape; two details make the output valid Node ESM:
 * relative imports get the `.js` extension the source's extensionless imports omit (TypeScript's declaration files
 * need the same), and the raw-state JSON fixtures are copied beside the compiled modules that read them.
 */
import { execFileSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** The repo root: beside this file when Node loads it, or the test runner's cwd when Vite rewrites import.meta.url. */
export const root = (() => {
  try {
    return fileURLToPath(new URL("../", import.meta.url));
  } catch {
    return `${process.cwd()}/`;
  }
})();
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");

const packages = [
  { name: "@dashhaus/core", dir: "packages/core", fixtures: "src/ha/fixtures" },
  { name: "@dashhaus/dashboard", dir: "packages/dashboard", cross: ["core"] },
  { name: "@dashhaus/orb", dir: "src/skins/orb", css: true, cross: ["core", "dashboard"] },
  { name: "@dashhaus/field", dir: "src/skins/field", css: true, cross: ["core", "dashboard"] },
  { name: "create-dashhaus-skin", dir: "packages/create-dashhaus-skin", copy: "src" },
];

const RELATIVE_SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']+)\2/g;
const HAS_EXTENSION = /\.(?:[cm]?js|json|css)$/;

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await files(path));
    else found.push(path);
  }
  return found;
}

async function rewriteImports(path) {
  const before = await readFile(path, "utf8");
  const after = before.replace(RELATIVE_SPECIFIER, (match, lead, quote, specifier) => {
    if (HAS_EXTENSION.test(specifier)) return match;
    const base = join(path, "..", specifier);
    if (existsSync(`${base}.js`) || existsSync(`${base}.d.ts`)) return `${lead}${quote}${specifier}.js${quote}`;
    if (existsSync(`${base}.json`)) return `${lead}${quote}${specifier}.json${quote}`;
    throw new Error(`${path}: cannot resolve emitted import "${specifier}"`);
  });
  if (after !== before) await writeFile(path, after);
}

export async function buildPackages(outRoot = root) {
  for (const pkg of packages) {
    const dir = join(root, pkg.dir);
    const dist = join(outRoot, pkg.dir, "dist");
    await rm(dist, { recursive: true, force: true });
    if (pkg.copy) {
      // A plain-ESM tool: its source and templates are the build output, copied so dist resolves them beside itself.
      await cp(join(dir, pkg.copy), dist, { recursive: true });
      console.log(`${pkg.name}: copied ${pkg.copy} → ${outRoot === root ? `${pkg.dir}/dist` : dist}`);
      continue;
    }
    let project = join(dir, "tsconfig.build.json");
    // A temporary build root is not installed in node_modules, so each package's build resolves the core and
    // dashboard builds beside it rather than a dist that may not exist in the repo.
    if (outRoot !== root && pkg.cross?.length) {
      const paths = {};
      for (const name of pkg.cross) {
        paths[`@dashhaus/${name}`] = [`packages/${name}/dist/index.d.ts`];
        paths[`@dashhaus/${name}/*`] = [`packages/${name}/dist/*`];
      }
      project = join(outRoot, `${pkg.dir.replaceAll("/", "-")}.tsconfig.json`);
      await writeFile(project, `${JSON.stringify({
        extends: join(dir, "tsconfig.build.json"),
        compilerOptions: { baseUrl: ".", typeRoots: [join(root, "node_modules", "@types")], paths },
      }, null, 2)}\n`);
    }
    execFileSync(process.execPath, [tsc, "-p", project, "--outDir", dist, "--pretty", "false"], { cwd: root, stdio: "inherit" });
    const emitted = await files(dist);
    await Promise.all(emitted.filter((path) => /\.(js|d\.ts)$/.test(path)).map(rewriteImports));
    if (pkg.fixtures) await cp(join(dir, pkg.fixtures), join(dist, "ha", "fixtures"), { recursive: true });
    let styles = 0;
    if (pkg.css) {
      // tsc leaves CSS imports alone; copy the stylesheets beside the modules that import them.
      for (const path of await files(dir)) {
        if (!path.endsWith(".css") || path.startsWith(dist)) continue;
        const target = join(dist, relative(dir, path));
        await mkdir(dirname(target), { recursive: true });
        await cp(path, target);
        styles += 1;
      }
    }
    console.log(`${pkg.name}: ${emitted.length + styles} files in ${outRoot === root ? `${pkg.dir}/dist` : dist}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildPackages();
}
