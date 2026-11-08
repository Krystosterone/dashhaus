import { describe, expect, it } from "vitest";
import { onHourCycle } from "./clock";
import { OWLET_WORST_CASE } from "./owlet";

describe("a seed on another hour cycle", () => {
  it("says every one of its times on that cycle, and nothing else", () => {
    const seed = { name: "Front door", lastChanged: "10:58", lastSeen: "Fri 18:30", nested: { at: "Mon 06:12", figure: "12:30 left" }, list: ["00:05"], level: 40 };
    expect(onHourCycle(seed, "h12")).toEqual({
      name: "Front door", lastChanged: "10:58\u00a0AM", lastSeen: "Fri 6:30\u00a0PM", nested: { at: "Mon 6:12\u00a0AM", figure: "12:30 left" }, list: ["12:05\u00a0AM"], level: 40,
    });
  });

  it("is the seed itself on 24 hours", () => {
    expect(onHourCycle(OWLET_WORST_CASE, "h23")).toEqual(OWLET_WORST_CASE);
  });
});
