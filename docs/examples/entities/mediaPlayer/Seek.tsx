import type { CSSProperties } from "react";
import { useHaMediaPlayer } from "@dashhaus/core";
import { usePlayhead, useSeek } from "@dashhaus/core/hooks";
import type { Seek } from "@dashhaus/core/hooks";
import { useSlider } from "@dashhaus/core/primitives";
import { playedShare } from "@dashhaus/core/entities/mediaPlayer/position";

/**
 * How far in, as a bar you slide to seek. While a finger or a key is on it the fill shows the draft, held still; it
 * seeks once, when it is let go, and runs on from there. Uses the same `fill` keyframes as the progress bar.
 */
function SeekBar({ seek }: { seek: Seek }) {
  const slider = useSlider<HTMLDivElement>({ ...seek.slider, inset: 0 });
  const { head, held } = seek;
  const fill: CSSProperties = {
    position: "absolute", inset: 0, background: "currentColor", transformOrigin: "left",
    transform: `scaleX(${playedShare(head)})`,
    animation: held ? "none" : `fill ${head.duration}s linear ${-head.at}s forwards`,
    animationPlayState: head.running ? "running" : "paused",
  };
  return (
    <div {...slider.rootProps} style={{ position: "relative", height: 32, background: "#ddd" }}>
      <span key={head.key} style={fill} />
      <div {...slider.hitProps} style={{ position: "absolute", inset: 0, touchAction: "pan-y" }} />
      <input aria-label="Position" {...slider.inputProps} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

/** A player's position you can seek, where it declares that it seeks; nothing for a stream or a player that can't. */
export function SeekLine({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaMediaPlayer(entityId, { loadHistory: false });
  const head = usePlayhead(entity);
  const seek = useSeek(entity.supportsSeek ? head : undefined, actions.onSeek);
  return seek ? <SeekBar seek={seek} /> : null;
}
