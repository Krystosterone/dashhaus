import { describe, expect, it } from "vitest";
import { PICTURE_WORDS, pictureTime, stillFrom } from "./picture";
import { WARNING_WORD_MAX } from "./severity";

describe("picture words", () => {
  it("says when a still is from, by the time it loaded", () => {
    const at = new Date(2026, 10, 7, 22, 14, 30).getTime();
    expect(pictureTime(at)).toMatch(/22:14|10:14/);
    expect(stillFrom(at)).toBe(`Still from ${pictureTime(at)}`);
    expect(stillFrom(undefined)).toBeUndefined();
  });

  it("fits a row", () => {
    for (const word of Object.values(PICTURE_WORDS)) expect(word.length, word).toBeLessThanOrEqual(WARNING_WORD_MAX);
  });
});
