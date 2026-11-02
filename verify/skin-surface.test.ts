/**
 * What the page around every skin's cards must get right, read from source the way the generators write it: a theme
 * attribute of the skin's own (spec/skins.md → Rules every skin keeps), and its web font through Storybook's seam and
 * a row for a rejected command (→ The page around the cards). The scaffold's templates are held to the same three,
 * so a standalone skin starts with them too.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
/** A folder's source files, recursively; a skin's built `dist/` and its `node_modules` are not source. */
const filesIn = (dir: string) => readdirSync(join(process.cwd(), dir), { recursive: true, encoding: "utf8" })
  .filter((file) => !/(?:^|\/)(?:dist|node_modules)(?:\/|$)/.test(file))
  .map((file) => `${dir}/${file}`);

const skins = readdirSync(join(process.cwd(), "src/skins"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(process.cwd(), "src/skins", entry.name, "lovelace/card.tsx")))
  .map((entry) => entry.name);

describe.each(skins)("the %s skin's page", (skin) => {
  const dir = `src/skins/${skin}`;

  it("themes on an attribute of its own", () => {
    const css = filesIn(dir).filter((file) => file.endsWith(".css")).map((file) => [file, read(file).replace(/\/\*[\s\S]*?\*\//g, "")] as const);
    expect(css.filter(([, source]) => /\[data-theme\b/.test(source)).map(([file]) => file), "CSS reads the shared data-theme, which another skin may set").toEqual([]);
    const code = filesIn(dir).filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."));
    expect(code.filter((file) => /(?:setAttribute|removeAttribute)\("data-theme"/.test(read(file))), "a skin sets the shared data-theme").toEqual([]);
  });

  it("gets its web font in Storybook as its Lovelace card does", () => {
    const card = read(`${dir}/lovelace/card.tsx`);
    const own = card.match(/fontHref = (\w+)/)?.[1];
    if (!own) return;
    const storybook = read(`${dir}/storybook.tsx`);
    expect(storybook, "storybook.tsx links no font of its own: .storybook/preview.tsx links the setup's fontHref").not.toContain('createElement("link")');
    expect(card, `${own} is declared once, beside the theme attribute, and imported by both surfaces`).not.toMatch(new RegExp(`const ${own}\\b`));
    expect(storybook, `the Storybook setup names ${own} as its fontHref`).toMatch(new RegExp(`fontHref: ${own}\\b`));
  });

  it("shows a rejected command on its Lovelace page", () => {
    const lovelace = filesIn(`${dir}/lovelace`).filter((file) => /\.tsx$/.test(file) && !file.endsWith(".test.tsx") && !file.endsWith(".stories.tsx"));
    expect(lovelace.filter((file) => read(file).includes("useActionStatus()")), "a row on useActionStatus from @dashhaus/dashboard").not.toEqual([]);
  });
});

describe("Storybook's font seam", () => {
  it("loads the font a skin's setup names before that skin's stories render", () => {
    const preview = read(".storybook/preview.tsx");
    expect(preview).toMatch(/fontHref\?: string/);
    expect(preview).toContain("loaders: [withSkinFont]");
    expect(preview).toContain("if (href) await loadFont(href);");
  });

  it("is the only way a skin's font reaches Storybook: preview-head.html links none", () => {
    expect(read(".storybook/preview-head.html")).not.toMatch(/<link[^>]+rel="stylesheet"|fonts\.googleapis\.com\/css/);
  });
});

describe("the page every skin starts from", () => {
  // The shared core in the scaffolder's templates: what new-skin lays out here and create-dashhaus-skin writes outside.
  const T = "packages/create-dashhaus-skin/src/templates";

  it("themes on the skin's own attribute, and a standalone skin's npm test refuses the shared one", () => {
    expect(read(`${T}/standalone/conformance.js`)).toContain("const SHARED_THEME = /\\[data-theme\\b/;");
    expect(read(`${T}/skin/styles/tokens.css`)).not.toMatch(/\[data-theme\b/);
    expect(read(`${T}/skin/styles/tokens.css`)).toContain('[data-__skin__-theme="dark"]');
    expect(read(`${T}/skin/shared/surface.ts`)).toContain('THEME_ATTRIBUTE = "data-__skin__-theme"');
    expect(read(`${T}/skin/lovelace/card.tsx`)).toMatch(/setAttribute\(__SKIN_CONST___THEME_ATTRIBUTE,/);
    expect(read(`${T}/standalone/preview/main.ts`)).not.toContain("dataset.theme");
  });

  it("names each card's article after its title, which opens its details, and links its font", () => {
    expect(read(`${T}/skin/lovelace/card.tsx`)).toContain("protected readonly fontHref = __SKIN_CONST___FONT_HREF;");
    const ui = read(`${T}/skin/shared/ui.tsx`);
    expect(ui).toContain("{...frame.article}");
    expect(ui).toMatch(/id=\{frame\.nameId\}[^>]*aria-haspopup="dialog"/);
  });

  it("draws the rejected-command row on its page", () => {
    expect(read(`${T}/skin/lovelace/__Skin__ActionStatus.tsx`)).toContain('import { useActionStatus } from "@dashhaus/dashboard/skin";');
    expect(read(`${T}/skin/lovelace/__Skin__ActionStatus.tsx`)).toContain("useActionStatus()");
    expect(read(`${T}/skin/lovelace/__Skin__Dashboard.tsx`)).toContain("<__Skin__ActionStatus />");
  });
});
