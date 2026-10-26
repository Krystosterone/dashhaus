import { afterEach, describe, expect, it, vi } from "vitest";
import { MAIN_PAGE, navigateInHa, resolveNav, sectionAnchors, sectionId } from "./nav";

const pages = [{ id: "living", title: "Living room" }, { id: "nursery", title: "Nursery" }];
const sections = sectionAnchors(["Quick actions", "Home status"]);

afterEach(() => history.replaceState(null, "", "/"));

describe("sectionId", () => {
  it("slugs a title, accents and all", () => {
    expect(sectionId("Living room")).toBe("section-living-room");
    expect(sectionId("Chambre d'été")).toBe("section-chambre-d-ete");
    expect(sectionId("  !! ")).toBe("section-untitled");
  });
});

describe("sectionAnchors", () => {
  it("gives a repeated title an id of its own", () => {
    expect(sectionAnchors(["Nursery", "Outside", "Nursery", "nursery"]).map((a) => a.id)).toEqual(["section-nursery", "section-outside", "section-nursery-2", "section-nursery-3"]);
  });
});

describe("resolveNav", () => {
  it("points each pill at its own section when two share a title", () => {
    const items = resolveNav({ mainTitle: "Home", pages: [], sections: sectionAnchors(["Nursery", "Security", "Nursery"]) });
    expect(items.map((i) => i.target)).toEqual([
      { kind: "section", title: "Nursery", id: "section-nursery" },
      { kind: "section", title: "Security", id: "section-security" },
      { kind: "section", title: "Nursery", id: "section-nursery-2" },
    ]);
  });

  it("lists the sections when the card has no pages and no nav", () => {
    expect(resolveNav({ mainTitle: "Home", pages: [], sections }).map((i) => i.label)).toEqual(["Quick actions", "Home status"]);
  });

  it("lists the main page and each page when the card has pages", () => {
    const items = resolveNav({ mainTitle: "Home", pages, sections });
    expect(items.map((i) => [i.label, i.target])).toEqual([
      ["Home", { kind: "page", id: MAIN_PAGE }],
      ["Living room", { kind: "page", id: "living" }],
      ["Nursery", { kind: "page", id: "nursery" }],
    ]);
  });

  it("names a dashboard from the frontend's panels, and marks it as leaving", () => {
    const [item] = resolveNav({
      entries: [{ kind: "navigate", path: "/baby-view/0" }],
      mainTitle: "Home",
      pages: [],
      sections,
      panels: { "baby-view": { url_path: "baby-view", title: "Baby View" } },
    });
    expect(item).toMatchObject({ label: "Baby View", leaves: true });
    expect(resolveNav({ entries: [{ kind: "navigate", path: "/other" }], mainTitle: "Home", pages: [], sections })[0].label).toBe("/other");
  });

  it("keeps a label the YAML gives, and leaves out what doesn't exist", () => {
    const items = resolveNav({
      entries: [
        { kind: "section", title: "Home status", label: "Status" },
        { kind: "section", title: "Gone" },
        { kind: "page", id: "attic" },
        { kind: "page", id: "living", label: "Living" },
      ],
      mainTitle: "Home",
      pages,
      sections,
    });
    expect(items.map((i) => i.label)).toEqual(["Status", "Living"]);
  });
});

describe("navigateInHa", () => {
  it("pushes the path and tells Home Assistant's router", () => {
    const heard = vi.fn();
    addEventListener("location-changed", heard);
    navigateInHa("/baby-view/0");
    removeEventListener("location-changed", heard);
    expect(location.pathname).toBe("/baby-view/0");
    expect(heard).toHaveBeenCalledOnce();
  });
});
