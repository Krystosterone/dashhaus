/**
 * The skin generator crosses every repository surface a skin owns. A dry run checks every anchor it edits, and one
 * generated skin in a temporary copy checks the package, registrations and build seams a real skin uses. The Field
 * reconstruction lives in `field.test.ts`; the three copies run at once.
 */
import { lstatSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { copyRepo, linkNodeModules, recordWorkspace, root, run, typecheckCopy } from "../repo-copy";

describe("new-skin", () => {
  it("finds every registration anchor without writing", async () => {
    const result = await run(root, "node", ["scripts/new-skin/index.js", "probe-skin", "--dry-run"]);
    expect(result.status, result.output).toBe(0);
    for (const path of [".storybook/preview.tsx", "apps/lovelace/entry.ts", "scripts/generated-skins.js", "spec/deploy.md"]) expect(result.output).toContain(`edit   ${path}`);
    expect(result.output).toContain("create src/skins/probe-skin/package.json");
    expect(result.output).toContain("create src/skins/probe-skin/index.ts");
    expect(result.output).toContain("create src/skins/probe-skin/lovelace/registry.tsx");
  });

  describe("a generated skin in a copy", () => {
    let copy = "";
    beforeAll(() => {
      copy = copyRepo("new-skin-canvas-");
    }, 120_000);
    afterAll(() => rmSync(copy, { recursive: true, force: true }));

    it("creates a linked workspace package that a Card lands in", async () => {
      const skin = await run(copy, "node", ["scripts/new-skin/index.js", "canvas"]);
      expect(skin.status, skin.output).toBe(0);
      const card = await run(copy, "node", ["scripts/new-card/index.js", "light", "--skin", "canvas"]);
      expect(card.status, card.output).toBe(0);
      linkNodeModules(copy);
      const workspace = await recordWorkspace(copy);
      expect(workspace.status, workspace.output).toBe(0);
      const lock = JSON.parse(readFileSync(join(copy, "package-lock.json"), "utf8"));
      expect(lock.packages["node_modules/@dashhaus/canvas"]).toMatchObject({ resolved: "src/skins/canvas", link: true });

      const manifest = JSON.parse(readFileSync(join(copy, "src/skins/canvas/package.json"), "utf8"));
      expect(manifest.name).toBe("@dashhaus/canvas");
      expect(manifest.private).toBe(true);
      expect(manifest.type).toBe("module");
      expect(manifest.exports).toEqual({
        ".": "./index.ts",
        "./styles/tokens.css": "./styles/tokens.css",
        "./lovelace/card": "./lovelace/card.tsx",
        "./storybook": "./storybook.tsx",
      });
      expect(lstatSync(join(copy, "node_modules/@dashhaus/canvas")).isSymbolicLink()).toBe(true);
      const require = createRequire(join(copy, "package.json"));
      expect(require.resolve("@dashhaus/canvas")).toMatch(/\/src\/skins\/canvas\/index\.ts$/);
      expect(require.resolve("@dashhaus/canvas/storybook")).toMatch(/\/src\/skins\/canvas\/storybook\.tsx$/);

      const preview = readFileSync(join(copy, ".storybook/preview.tsx"), "utf8");
      expect(preview).toContain('from "@dashhaus/canvas/storybook"');
      expect(preview).toContain('"Canvas", [');
      expect(preview).toContain('"Light"');
      const entry = readFileSync(join(copy, "apps/lovelace/entry.ts"), "utf8");
      expect(entry).toContain('import "@dashhaus/canvas/styles/tokens.css";');
      expect(entry).toContain('from "@dashhaus/canvas/lovelace/card"');
      expect(readFileSync(join(copy, "src/skins/canvas/lovelace/registry.tsx"), "utf8")).toContain("light: { domains: [\"light\"]");
      expect(readFileSync(join(copy, "src/skins/canvas/index.ts"), "utf8")).toContain("CanvasLightCard");

      // The page around the cards: the skin's own theme attribute, its font seam, a named article and the rejected-command row.
      const skinFile = (path: string) => readFileSync(join(copy, "src/skins/canvas", path), "utf8");
      expect(skinFile("styles/tokens.css")).toContain('[data-canvas-theme="dark"]');
      expect(skinFile("styles/tokens.css")).not.toMatch(/\[data-theme\b/);
      expect(skinFile("shared/surface.ts")).toContain('CANVAS_THEME_ATTRIBUTE = "data-canvas-theme"');
      expect(skinFile("lovelace/card.tsx")).toContain("setAttribute(CANVAS_THEME_ATTRIBUTE,");
      expect(skinFile("lovelace/card.tsx")).toContain("protected readonly fontHref = CANVAS_FONT_HREF;");
      expect(skinFile("storybook.tsx")).toContain("fontHref: CANVAS_FONT_HREF,");
      expect(skinFile("storybook.tsx")).toContain("canvasTheme: {");
      expect(skinFile("shared/ui.tsx")).toContain("<article {...frame.article}");
      expect(skinFile("shared/ui.tsx")).toContain('id={frame.nameId} className="canvas-title" aria-haspopup="dialog"');
      expect(skinFile("lovelace/CanvasDashboard.tsx")).toContain("<CanvasActionStatus />");
      expect(skinFile("lovelace/CanvasActionStatus.tsx")).toContain("useActionStatus()");

      const typecheck = await typecheckCopy(copy);
      expect(typecheck.status, typecheck.output).toBe(0);
      const lint = await run(copy, "npx", ["eslint", "src/skins/canvas", "scripts/new-card", "scripts/new-skin", "verify/generator-packages.test.ts"]);
      expect(lint.status, lint.output).toBe(0);
      const tests = await run(copy, "npx", ["vitest", "run", "--config", "config/vitest.config.ts", "src/skins/canvas", "verify/storybook.test.ts", "verify/boundaries.test.ts", "verify/generator-packages.test.ts", "verify/skin-surface.test.ts", "verify/studies.test.ts"]);
      expect(tests.status, tests.output).toBe(0);
      const bundle = await run(copy, "npm", ["run", "build:ha"]);
      expect(bundle.status, bundle.output).toBe(0);
      expect(readFileSync(join(copy, "dist/dashhaus.js"), "utf8"), "the skin ships in the bundle").toContain("dashhaus-canvas");
      // Its stories build: the static indexer reads the sort order new-skin and new-card register.
      const storybook = await run(copy, "npm", ["run", "build-storybook", "--", "--quiet"]);
      expect(storybook.status, storybook.output).toBe(0);
      const index = JSON.parse(readFileSync(join(copy, "storybook-static/index.json"), "utf8"));
      expect(Object.keys(index.entries)).toEqual(expect.arrayContaining(["canvas-cards-light--unavailable", "canvas-connected-light--injected-transport"]));
    }, 420_000);
  });

});
