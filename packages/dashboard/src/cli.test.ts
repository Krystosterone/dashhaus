import { describe, expect, it } from "vitest";
import { generatedDashboards } from "./cli";

describe("generatedDashboards", () => {
  it("registers a generated skin at its own path with its own card", async () => {
    const [canvas] = generatedDashboards([{ id: "canvas", title: "Home (Canvas)", icon: "mdi:view-dashboard-outline" }]);
    expect(canvas).toMatchObject({ path: "home-dashboard-canvas", title: "Home (Canvas)", icon: "mdi:view-dashboard-outline" });
    expect(await canvas.card({ send: async () => undefined })).toEqual({
      card: { type: "custom:home-dashboard-canvas", title: "Home" },
      made: "the canvas skin's automatic layout",
    });
  });

  it("keeps the page title of every skin's card, and its own sidebar title", async () => {
    const [canvas] = generatedDashboards([{ id: "canvas", title: "Canvas", icon: "mdi:view-dashboard-outline" }], "Flat");
    expect(canvas.title).toBe("Canvas");
    expect((await canvas.card({ send: async () => undefined })).card).toEqual({ type: "custom:home-dashboard-canvas", title: "Flat" });
  });
});
