import { act, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaVacuumModule } from "./HaVacuumModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/vacuum.json";

const raw = fixture as HassEntities;
const ID = "vacuum.downstairs";
const renderLive = () => renderConnected(<HaVacuumModule entityId={ID} loadHistory={false} />, raw);

describe("HaVacuumModule", () => {
  it("sends its keys' presses to Home Assistant: Pause while it cleans, then Return", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("cleaning"));
    const keys = [...live.container.querySelectorAll<HTMLButtonElement>(".fd-key")];
    const before = live.callService.mock.calls.length;
    await act(async () => {
      for (const key of keys) fireEvent.click(key);
      await Promise.resolve();
    });
    expect(live.callService.mock.calls.slice(before).map(([domain, service]) => `${domain}.${service}`)).toEqual(["vacuum.pause", "vacuum.return_to_base"]);
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
