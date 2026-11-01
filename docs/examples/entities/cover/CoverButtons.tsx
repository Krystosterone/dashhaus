import { useHaCover } from "@dashhaus/core";

export function CoverButtons({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaCover(entityId);
  return (
    <div role="group" aria-label={entity.name}>
      <button type="button" onClick={actions.onOpenCover}>
        Open
      </button>
      {entity.supportsStop && (
        <button type="button" onClick={actions.onStopCover}>
          Stop
        </button>
      )}
      <button type="button" onClick={actions.onCloseCover}>
        Close
      </button>
      <span>{entity.position == null ? entity.state : `${entity.position}% open`}</span>
    </div>
  );
}
