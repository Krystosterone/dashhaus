import { describe, expect, it } from "vitest";
import { generatedDashboards } from "./config.js";

describe("generatedDashboards", () => {
  it("registers a generated skin at its own path with its own card", async () => {
    const [canvas] = generatedDashboards([{ id: "canvas", title: "Home (Canvas)", icon: "mdi:view-dashboard-outline" }]);
    expect(canvas).toMatchObject({ path: "dashhaus-canvas", title: "Home (Canvas)", icon: "mdi:view-dashboard-outline" });
    expect(await canvas.card({ send: async () => undefined })).toEqual({
      card: { type: "custom:dashhaus-canvas", title: "Home" },
      made: "the canvas skin's automatic layout",
    });
  });

  it("keeps the page title of every skin's card, and its own sidebar title", async () => {
    const [canvas] = generatedDashboards([{ id: "canvas", title: "Canvas", icon: "mdi:view-dashboard-outline" }], "Flat");
    expect(canvas.title).toBe("Canvas");
    expect((await canvas.card({ send: async () => undefined })).card).toEqual({ type: "custom:dashhaus-canvas", title: "Flat" });
  });
});
