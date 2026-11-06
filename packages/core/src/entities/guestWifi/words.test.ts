import { describe, expect, it } from "vitest";
import { codeGroups, durationMinutes, durationWords, inUse, isGroupedCode, joinWords, lastsWords, newSecretWords, secretWord, shortTerms, spokenCode, usesWords } from "./words";

describe("durationMinutes", () => {
  it("reads the integration's durations", () => {
    expect(durationMinutes("1 d")).toBe(1440);
    expect(durationMinutes("2 h, 30 min")).toBe(150);
    expect(durationMinutes("1 d, 2 h, 3 min, 4 s")).toBe(1563);
    expect(durationMinutes("90 s")).toBe(2);
  });

  it("is undefined for anything else", () => {
    for (const text of [undefined, "", "a while", "1 week", "-1 d", "1.5 h", 24]) expect(durationMinutes(text)).toBeUndefined();
  });
});

describe("durationWords", () => {
  it("says the largest two units", () => {
    expect(durationWords(1440)).toBe("1 day");
    expect(durationWords(10080)).toBe("7 days");
    expect(durationWords(1500)).toBe("1 day 1 h");
    expect(durationWords(1092)).toBe("18 h 12 min");
    expect(durationWords(480)).toBe("8 h");
    expect(durationWords(45)).toBe("45 min");
    expect(durationWords(0)).toBe("1 min");
  });
});

describe("usesWords", () => {
  it("says how many uses are left", () => {
    expect(usesWords({ allowed: 1, used: 0 })).toBe("Single use");
    expect(usesWords({ allowed: 5, used: 0 })).toBe("5 uses");
    expect(usesWords({ allowed: 5, used: 2 })).toBe("3 of 5 uses left");
    expect(usesWords({ allowed: "unlimited", used: 4 })).toBe("Unlimited uses");
    expect(usesWords({})).toBeUndefined();
  });
});

describe("lastsWords", () => {
  it("says the time left once used, else how long it lasts", () => {
    expect(lastsWords({ lastsMinutes: 1440 })).toBe("Lasts 1 day");
    expect(lastsWords({ lastsMinutes: 1440, leftMinutes: 1092 })).toBe("18 h 12 min left");
    expect(lastsWords({})).toBeUndefined();
  });
});

describe("the code", () => {
  it("is read a character at a time, its groups apart", () => {
    expect(spokenCode("98668-49366")).toBe("9 8 6 6 8, 4 9 3 6 6");
    expect(codeGroups("98668-49366")).toEqual(["98668", "49366"]);
  });

  it("is in use once someone has joined with it", () => {
    expect(inUse({ used: 0 })).toBe(false);
    expect(inUse({ used: 1 })).toBe(true);
    expect(inUse({ used: 0, leftMinutes: 30 })).toBe(true);
  });

  it("reads a password every character, naming capitals and symbols", () => {
    expect(isGroupedCode("98668-49366")).toBe(true);
    expect(isGroupedCode("ripe-Mango-42")).toBe(false);
    expect(spokenCode("ripe-Mango-42")).toBe("r i p e dash capital M a n g o dash 4 2");
  });

  it("says how to join, a code's network or a password's", () => {
    expect(joinWords({ access: "code", network: "Maple Guests" })).toBe("Join Maple Guests, then enter the code on the page that opens.");
    expect(joinWords({ access: "code" })).toBe("Join the network, then enter the code on the page that opens.");
    expect(joinWords({ access: "password", network: "Maple Guests 5G", qr: "qr.png" })).toBe("Scan to join Maple Guests 5G, or choose it in Wi-Fi settings and type the password.");
    expect(joinWords({ access: "password", network: "Maple Guests 5G" })).toBe("Choose Maple Guests 5G in Wi-Fi settings and type the password.");
  });

  it("names what a guest types, and what a new one does to those already in", () => {
    expect(secretWord({ access: "code" })).toBe("code");
    expect(secretWord({ access: "password" })).toBe("password");
    expect(newSecretWords({ access: "code" })).toBe("The codes already given keep working.");
    expect(newSecretWords({ access: "password" })).toBe("Devices already joined will need the new password.");
  });
});

describe("shortTerms", () => {
  it("fits uses and length to a screen's two short lines", () => {
    expect(shortTerms({ allowed: 1, used: 0, lastsMinutes: 1440 })).toEqual(["Single use", "Lasts 1 day"]);
    expect(shortTerms({ allowed: 5, used: 2, lastsMinutes: 1440, leftMinutes: 1092 })).toEqual(["3 of 5 left", "18 h left"]);
    expect(shortTerms({ allowed: "unlimited", used: 0, lastsMinutes: 10080 })).toEqual(["Unlimited", "Lasts 7 days"]);
    expect(shortTerms({ allowed: 9999, used: 9998, leftMinutes: 524_159 })).toEqual(["1 of 9999 left", "363 days left"]);
    expect(shortTerms({})).toEqual([]);
  });
});
