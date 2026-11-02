/**
 * What the page around every skin's cards must get right, read from source the way the generators write it
 * (spec/skins.md → The page around the cards): a theme attribute of the skin's own, its web font in Storybook through
 * the setup's `fontHref`, and a row for a rejected command on its Lovelace page. The scaffold's templates are held to
 * the same three, so a standalone skin starts with them too.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const filesIn = (dir: string) => readdirSync(join(process.cwd(), dir), { recursive: true, encoding: "utf8" }).map((file) => `${dir}/${file}`);

/** Orb keeps `data-theme`, from before skins shared a Storybook; it is the one skin that may. */
const SHARED_THEME = new Set(["orb"]);

const skins = readdirSync(join(process.cwd(), "src/skins"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(process.cwd(), "src/skins", entry.name, "lovelace/card.tsx")))
  .map((entry) => entry.name);

/** The font families a Google Fonts stylesheet URL asks for. */
const families = (href: string) => [...href.matchAll(/family=([^&"]+)/g)].map((match) => match[1]);

describe.each(skins)("the %s skin's page", (skin) => {
  const dir = `src/skins/${skin}`;

  it("themes on an attribute of its own", () => {
    if (SHARED_THEME.has(skin)) return;
    const css = read(`${dir}/styles/tokens.css`);
    expect(css, "tokens.css reads the shared data-theme, which another skin's toolbar leaves on <html>").not.toMatch(/\[data-theme\b/);
    expect(read(`${dir}/lovelace/card.tsx`)).not.toMatch(/setAttribute\("data-theme"/);
  });

  it("gets its web font in Storybook as its Lovelace card does", () => {
    const card = read(`${dir}/lovelace/card.tsx`);
    const own = card.match(/fontHref = (\w+)/)?.[1];
    if (!own) return;
    const storybook = read(`${dir}/storybook.tsx`);
    expect(storybook, "storybook.tsx links no font of its own: .storybook/preview.tsx links the setup's fontHref").not.toContain('createElement("link")');
    const literal = card.match(new RegExp(`const ${own}(?::[^=]+)? = "([^"]+)"`))?.[1];
    if (literal) {
      // A font declared in the card itself is Orb's or Field's, linked by preview-head.html before the first paint.
      const head = read(".storybook/preview-head.html");
      expect(families(literal).filter((family) => !head.includes(family))).toEqual([]);
    } else {
      expect(storybook, `the Storybook setup names ${own} as its fontHref`).toMatch(new RegExp(`fontHref: ${own}\\b`));
    }
  });

  it("shows a rejected command on its Lovelace page", () => {
    const lovelace = filesIn(`${dir}/lovelace`).filter((file) => /\.tsx$/.test(file) && !file.endsWith(".test.tsx") && !file.endsWith(".stories.tsx"));
    expect(lovelace.filter((file) => read(file).includes("useActionStatus()")), "a row on useActionStatus from @dashhaus/dashboard").not.toEqual([]);
  });
});

describe("Storybook's font seam", () => {
  it("links the font a skin's setup names, for that skin's stories", () => {
    const preview = read(".storybook/preview.tsx");
    expect(preview).toMatch(/fontHref\?: string/);
    expect(preview).toContain("if (skin?.fontHref) linkFont(skin.fontHref);");
  });
});

describe("the scaffold's page", () => {
  const T = "packages/create-dashhaus-skin/src/templates";

  it("themes on the skin's own attribute", () => {
    expect(read(`${T}/styles/tokens.css`)).not.toMatch(/\[data-theme\b/);
    expect(read(`${T}/styles/tokens.css`)).toContain('[data-__skin__-theme="dark"]');
    expect(read(`${T}/lovelace/card.tsx`)).toContain('THEME_ATTRIBUTE = "data-__skin__-theme"');
    expect(read(`${T}/lovelace/card.tsx`)).toMatch(/setAttribute\(__SKIN_CONST___THEME_ATTRIBUTE,/);
    expect(read(`${T}/preview/main.ts`)).not.toContain("dataset.theme");
  });

  it("names each card's article and links its font", () => {
    expect(read(`${T}/lovelace/card.tsx`)).toContain("protected readonly fontHref = FONT_HREF;");
    const ui = read(`${T}/shared/ui.tsx`);
    expect(ui.match(/aria-haspopup="dialog"/g)?.length).toBe(2);
    expect(ui).toContain("<span id={id}>{name}</span>");
  });

  it("draws the rejected-command row on its page", () => {
    expect(read(`${T}/lovelace/ActionStatus.tsx`)).toContain("useActionStatus()");
    expect(read(`${T}/lovelace/card.tsx`)).toContain("<ActionStatus />");
  });
});
