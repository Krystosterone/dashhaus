import { useState } from "react";
import { useHaCover } from "@dashhaus/core";
import type { CoverAction } from "@dashhaus/core/entities/cover/types";
import { coverAsksFirst } from "@dashhaus/core/entities/cover/position";
import { coverAskAction, coverAskDetail, coverQuestion } from "@dashhaus/core/entities/cover/words";

/** Open, stop and close, asking first for a garage door, door or gate, which must never move on one stray press. */
export function CoverButtons({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaCover(entityId);
  const [asking, setAsking] = useState<CoverAction | null>(null);
  const run = (action: CoverAction) => (action === "open" ? actions.onOpenCover() : actions.onCloseCover());
  const press = (action: CoverAction) => (coverAsksFirst(entity) ? setAsking(action) : run(action));

  if (asking) {
    return (
      <div role="group" aria-label={coverQuestion(asking, entity.name)}>
        <p>{coverQuestion(asking, entity.name)} {coverAskDetail(asking, entity)}</p>
        <button type="button" onClick={() => setAsking(null)}>Cancel</button>
        <button type="button" onClick={() => { run(asking); setAsking(null); }}>{coverAskAction(asking, entity)}</button>
      </div>
    );
  }
  return (
    <div role="group" aria-label={entity.name}>
      <button type="button" onClick={() => press("open")}>
        Open
      </button>
      {entity.supportsStop && (
        <button type="button" onClick={actions.onStopCover}>
          Stop
        </button>
      )}
      <button type="button" onClick={() => press("close")}>
        Close
      </button>
      <span>{entity.position == null ? entity.state : `${entity.position}% open`}</span>
    </div>
  );
}
