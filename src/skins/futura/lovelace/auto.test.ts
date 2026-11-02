import { describe, expect, it } from "vitest";
import { areaName, autoCards, groupByArea } from "./auto";

describe("Futura automatic layout", () => {
  it("ignores entities whose domain has no registered Card", () => {
    expect(autoCards({ states: { "input_text.note": { attributes: { friendly_name: "Note" } } } })).toEqual([]);
  });
  it("resolves entity area before device area and groups missing areas last", () => {
    const input = { states: {}, entities: { "light.a": { area_id: "living", device_id: "lamp" }, "light.b": { device_id: "lamp" } }, devices: { lamp: { area_id: "kitchen" } }, areas: { living: { name: "Living room" }, kitchen: { name: "Kitchen" } } };
    expect(areaName(input, "light.a")).toBe("Living room");
    expect(areaName(input, "light.b")).toBe("Kitchen");
    expect(groupByArea([{ area: undefined, id: 1 }, { area: "Kitchen", id: 2 }]).map((group) => group.area)).toEqual(["Kitchen", undefined]);
  });
});
