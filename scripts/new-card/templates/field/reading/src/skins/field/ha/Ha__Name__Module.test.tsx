import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Ha__Name__Module } from "./Ha__Name__Module";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities } from "../../../ha/types";
import fixture from "../../../ha/fixtures/__name__.json";

const raw = fixture as HassEntities;
const ID = "__fixtureId__";

describe("Ha__Name__Module", () => {
  it("reads the entity from the store, and blanks its screen when it stops responding", async () => {
    let listener: ((entities: HassEntities) => void) | undefined;
    const transport: HaTransport = {
      subscribeEntities(next) {
        listener = next;
        queueMicrotask(() => next(raw));
        return () => { listener = undefined; };
      },
      callService: async () => undefined,
    };
    const { container } = render(
      <HaProvider store={createHaStore(transport)}>
        <Ha__Name__Module entityId={ID} loadHistory={false} />
      </HaProvider>,
    );
    await waitFor(() => expect(container.querySelector(".fd-module")?.getAttribute("data-state")).not.toBe("unavailable"));
    act(() => listener?.({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});
