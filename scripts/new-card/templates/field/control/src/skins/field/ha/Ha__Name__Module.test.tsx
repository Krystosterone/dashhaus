import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Ha__Name__Module } from "./Ha__Name__Module";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities } from "../../../ha/types";
import fixture from "../../../ha/fixtures/__name__.json";

const raw = fixture as HassEntities;
const ID = "__fixtureId__";

function renderLive() {
  let listener: ((entities: HassEntities) => void) | undefined;
  const callService = vi.fn(async () => undefined);
  const transport: HaTransport = {
    subscribeEntities(next) {
      listener = next;
      queueMicrotask(() => next(raw));
      return () => { listener = undefined; };
    },
    callService,
  };
  const { container } = render(
    <HaProvider store={createHaStore(transport)}>
      <Ha__Name__Module entityId={ID} loadHistory={false} />
    </HaProvider>,
  );
  return { container, callService, emit: (entities: HassEntities) => listener?.(entities) };
}

describe("Ha__Name__Module", () => {
  it("sends the key's press to Home Assistant", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector<HTMLButtonElement>(".fd-key")?.disabled).toBe(false));
    await act(async () => {
      fireEvent.click(live.container.querySelector(".fd-key")!);
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalled();
  });

  it("lays the key flat when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-key")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector<HTMLButtonElement>(".fd-key")?.disabled).toBe(true));
  });
});
