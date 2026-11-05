import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKIN = "src/skins/titan";
const TOKENS = `${SKIN}/styles/tokens.css`;
const files = readdirSync(join(process.cwd(), SKIN), { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".css")).map((file) => `${SKIN}/${file}`);
const css = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("Titan generated design rules", () => {
  it("keeps colours in scoped tokens", () => {
    for (const path of files.filter((file) => file !== TOKENS)) expect(css(path), path).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklch|lab)\(/i);
    const custom = [...css(TOKENS).matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]);
    expect(custom.filter((name) => !name.startsWith("--titan-"))).toEqual([]);
  });

  it("themes on the skin's own attribute, with every token block on :root", () => {
    const source = css(TOKENS);
    const attributes = [...source.matchAll(/\[(data-[\w-]+)/g)].map((match) => match[1]);
    expect(attributes.length).toBeGreaterThan(0);
    expect(attributes.filter((name) => name !== "data-titan-theme")).toEqual([]);
    const selectors = [...source.matchAll(/([^{}]+)\{[^{}]*?--titan-[\w-]+\s*:/g)].map((match) => match[1].trim());
    expect(selectors.filter((selector) => !selector.split(",").every((part) => part.trim().startsWith(":root")))).toEqual([]);
  });

  it("sets footprint height independently of state and viewport", () => {
    const source = css(`${SKIN}/shared/ui.css`);
    expect(source).toMatch(/\.titan-card\s*\{[\s\S]*?height:\s*196px/);
    expect(source).toMatch(/data-footprint="compact"[^}]*height:\s*48px/);
    expect(source).not.toMatch(/data-state[^}]*height\s*:/);
    expect(source).not.toMatch(/height:\s*\d+vh/);
  });

  it("animates compositor or colour properties with skin easing", () => {
    for (const path of files) {
      for (const [, value] of css(path).matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g)) {
        expect(value, path).not.toMatch(/\b(?:width|height|margin|padding|top|right|bottom|left|grid|flex)\b/);
        expect(value, path).toContain("var(--titan-");
      }
    }
  });

  it("keeps controls non-selectable and touch-safe", () => {
    const source = css(`${SKIN}/shared/ui.css`);
    expect(source).toMatch(/\.titan-action[^}]*user-select:\s*none/);
    expect(source).toMatch(/\.titan-action[^}]*touch-action:\s*manipulation/);
    expect(source).toContain("@media (hover: hover) and (pointer: fine)");
  });
});
