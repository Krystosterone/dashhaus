import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HassEntities } from "@scope/core";
import { renderConnected } from "@scope/core/testing";
import { parseDashboardConfig } from "./config";
import { ConfigDashboard } from "./ConfigDashboard";

const light = (id: string, name: string) => ({ entity_id: id, state: "on", attributes: { friendly_name: name, supported_color_modes: ["onoff"] } });
const raw: HassEntities = { "light.a": light("light.a", "Desk"), "light.b": light("light.b", "Pendant") };

function draw(yaml: Record<string, unknown>) {
  const config = parseDashboardConfig(yaml);
  return renderConnected(
    <ConfigDashboard config={{ ...config, blocks: config.blocks ?? [] }} panels={{ "baby-view": { url_path: "baby-view", title: "Baby View" } }} now={new Date(2026, 9, 17, 11, 54)} />,
    raw,
  );
}

const nav = () => screen.queryByRole("navigation", { name: "Dashboard" });
const sections = [{ title: "Quick actions", cards: ["light.a"] }, { title: "Home status", cards: ["light.b"] }];

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => history.replaceState(null, "", "/"));

describe("ConfigDashboard nav", () => {
  it("lists the sections by default, and jumps to one", async () => {
    draw({ sections });
    const bar = nav()!;
    expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual(["Quick actions", "Home status"]);

    fireEvent.click(within(bar).getByRole("button", { name: "Home status" }));
    expect(document.querySelector("[data-section-id=section-home-status]")!.scrollIntoView).toHaveBeenCalled();
    expect(within(bar).getByRole("button", { name: "Home status" }).getAttribute("aria-current")).toBe("location");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
  });

  it("sends each of two same-titled sections' pills to its own section", async () => {
    draw({ sections: [{ title: "Nursery", cards: ["light.a"] }, { title: "Status", cards: ["light.b"] }, { title: "Nursery", cards: ["light.b"] }] });
    const pills = within(nav()!).getAllByRole("button", { name: "Nursery" });
    expect(pills).toHaveLength(2);
    fireEvent.click(pills[1]);
    // One mock on the prototype: which element it scrolled is the call's `this`.
    const scrolled = vi.mocked(Element.prototype.scrollIntoView).mock.contexts;
    expect(scrolled).toEqual([document.querySelector("[data-section-id=section-nursery-2]")]);
    expect(pills[1].getAttribute("aria-current")).toBe("location");
    expect(pills[0].hasAttribute("aria-current")).toBe(false);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
  });

  it("opens the card's own pages, keeps them in the URL, and follows back", async () => {
    draw({ title: "Home", sections, pages: [{ id: "living", title: "Living room", sections: [{ title: "Lights", cards: ["light.b"] }] }] });
    const bar = nav()!;
    expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual(["Home", "Living room"]);

    fireEvent.click(within(bar).getByRole("button", { name: "Living room" }));
    expect(screen.getByRole("heading", { level: 1, name: "Living room" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Lights" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Quick actions" })).toBeNull();
    expect(location.hash).toBe("#page=living");
    expect(within(bar).getByRole("button", { name: "Living room" }).getAttribute("aria-current")).toBe("page");

    act(() => {
      history.replaceState(null, "", "/");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Quick actions" })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
  });

  it("returns to the main page for a section picked from another page", async () => {
    history.replaceState(null, "", "/#page=living");
    draw({ sections, pages: [{ id: "living", title: "Living room", sections: [{ title: "Lights", cards: ["light.b"] }] }], nav: [{ page: "living" }, { section: "Home status" }] });
    fireEvent.click(within(nav()!).getByRole("button", { name: "Home status" }));
    expect(location.hash).toBe("");
    await waitFor(() => expect(document.querySelector("[data-section-id=section-home-status]")?.scrollIntoView).toHaveBeenCalled());
  });

  it("leaves for another dashboard through Home Assistant's router, named from its panels", () => {
    draw({ sections, nav: [{ section: "Quick actions" }, { navigate: "/baby-view/0" }] });
    const heard = vi.fn();
    addEventListener("location-changed", heard);
    const leave = within(nav()!).getByRole("button", { name: "Baby View, another dashboard" });
    fireEvent.click(leave);
    removeEventListener("location-changed", heard);
    expect(location.pathname).toBe("/baby-view/0");
    expect(heard).toHaveBeenCalledOnce();
  });

  it("has no nav when told so, on a wall panel by default, or with one place to go", async () => {
    const cases = [{ sections, nav: false }, { sections, viewing: "far" }, { sections: [sections[0]] }];
    for (const yaml of cases) {
      const view = draw(yaml);
      expect(nav()).toBeNull();
      await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
      view.unmount();
    }
    draw({ sections, viewing: "far", nav: [{ section: "Quick actions" }, { section: "Home status" }] });
    expect(nav()).not.toBeNull();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
  });
});
