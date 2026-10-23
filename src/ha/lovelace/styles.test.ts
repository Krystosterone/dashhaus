import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scopeToHost } from "./styles";

describe("scopeToHost", () => {
  it("moves the theme selectors onto the shadow host", () => {
    expect(scopeToHost(':root { --a: 1 } :root:not([data-theme="light"]) { --a: 2 } :root[data-theme="dark"] { --a: 3 }'))
      .toBe(':host { --a: 1 } :host(:not([data-theme="light"])) { --a: 2 } :host([data-theme="dark"]) { --a: 3 }');
  });

  it("handles the minified form, without quotes", () => {
    expect(scopeToHost(":root:not([data-theme=light]){--a:2}:root[data-theme=dark]{--a:3}"))
      .toBe(":host(:not([data-theme=light])){--a:2}:host([data-theme=dark]){--a:3}");
  });

  it("leaves no :root in tokens.css", () => {
    const tokens = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");
    expect(scopeToHost(tokens)).not.toMatch(/:root/);
  });
});
