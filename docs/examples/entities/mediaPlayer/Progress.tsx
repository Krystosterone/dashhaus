import type { CSSProperties } from "react";
import { useHaMediaPlayer } from "@dashhaus/core";
import { usePlayhead } from "@dashhaus/core/hooks";
import { playTimeSpoken, playedShare } from "@dashhaus/core/entities/mediaPlayer/position";

/**
 * How far in, as a bar that fills by itself: one CSS animation as long as the track, started where it is now and held
 * while it is paused. `key` starts it again when the position, the state or the track changes. In your stylesheet:
 * `@keyframes fill { from { transform: scaleX(0) } to { transform: scaleX(1) } }`.
 */
export function Progress({ entityId }: { entityId: string }) {
  const { entity } = useHaMediaPlayer(entityId, { loadHistory: false });
  const head = usePlayhead(entity);
  if (!head) return null;
  const fill: CSSProperties = {
    display: "block", height: 4, background: "currentColor", transformOrigin: "left",
    transform: `scaleX(${playedShare(head)})`,
    animation: `fill ${head.duration}s linear ${-head.at}s forwards`,
    animationPlayState: head.running ? "running" : "paused",
  };
  return (
    <span role="img" aria-label={`${playTimeSpoken(head.at)} of ${playTimeSpoken(head.duration)}`} style={{ display: "block", background: "#ddd" }}>
      <span key={head.key} style={fill} />
    </span>
  );
}
