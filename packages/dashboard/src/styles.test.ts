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
});
