/**
 * Build and pack the three public packages: `npm run release:pack [-- --out release]`.
 *
 * npm packs a staged copy holding only the files the package ships and its release manifest (no `private`, no
 * `source` condition, internal `@scope` ranges pinned). The tarballs are the publish artifacts; publishing is the
 * operator's call. The build output is `packages/{core,dashboard}/dist`; deploy already runs from its `.mjs` sources.
 */
import { execFileSync } from "node:child_process";
import { copyFile, cp, mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { buildPackages } from "../build-packages.mjs";
import { publicPackages, publishManifest, readManifest, root } from "./manifest.mjs";

const outIndex = process.argv.indexOf("--out");
const out = resolve(root, outIndex === -1 ? "release" : process.argv[outIndex + 1] ?? "release");

/** A ship entry, or the files a `*` pattern names in its folder. */
async function matches(dir, pattern) {
  const slash = pattern.lastIndexOf("/");
  const base = slash === -1 ? "" : pattern.slice(0, slash + 1);
  const file = pattern.slice(slash + 1);
  if (!file.includes("*")) return [{ base, file }];
  const expression = new RegExp(`^${file.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
  return (await readdir(join(root, dir, base))).filter((name) => expression.test(name)).map((name) => ({ base, file: name }));
}

async function stageFiles(stage, dir, patterns) {
  for (const pattern of patterns) {
    for (const { base, file } of await matches(dir, pattern)) {
      const from = join(root, dir, base, file);
      const to = join(stage, base, file);
      await mkdir(join(to, ".."), { recursive: true });
      if ((await stat(from)).isDirectory()) await cp(from, to, { recursive: true });
      else await copyFile(from, to);
    }
  }
}

export async function pack() {
  await buildPackages();
  await mkdir(out, { recursive: true });
  for (const file of await readdir(out)) {
    if (file.endsWith(".tgz")) await rm(join(out, file), { force: true });
  }

  const stageRoot = await mkdtemp(join(tmpdir(), "home-dashboard-pack-"));
  const packed = [];
  try {
    for (const pkg of publicPackages) {
      const manifest = publishManifest(await readManifest(pkg.dir));
      const stage = join(stageRoot, pkg.key);
      await mkdir(stage, { recursive: true });
      await writeFile(join(stage, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
      await stageFiles(stage, pkg.dir, pkg.ship);
      execFileSync("npm", ["pack", "--pack-destination", out, "--silent"], { cwd: stage, stdio: "inherit" });
      const tarball = join(out, `${manifest.name.replace(/^@/, "").replace("/", "-")}-${manifest.version}.tgz`);
      const { size } = await stat(tarball);
      packed.push({ package: manifest.name, version: manifest.version, tarball, size });
      console.log(`${manifest.name}@${manifest.version} → ${tarball} (${(size / 1024).toFixed(1)} KiB)`);
    }
  } finally {
    await rm(stageRoot, { recursive: true, force: true });
  }
  return packed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await pack();
}
