/**
 * Every skin's tokens load into a shadow root, so `scopeToHost` (src/ha/lovelace/styles.ts) must leave no `:root`
 * selector behind in any skin's tokens.css. The skins are named here rather than in `styles.test.ts`, which tests
 * the function itself and knows no skin.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scopeToHost } from "../src/ha/lovelace";

const skins = readdirSync(join(process.cwd(), "src/skins"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

describe("the skins' tokens", () => {
  it.each(skins)("leaves no :root in the %s skin's tokens.css", (skin) => {
    const tokens = readFileSync(join(process.cwd(), "src/skins", skin, "styles/tokens.css"), "utf8");
    expect(scopeToHost(tokens)).not.toMatch(/:root/);
  });
});
