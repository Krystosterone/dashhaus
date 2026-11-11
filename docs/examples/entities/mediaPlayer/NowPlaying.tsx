import { useHaMediaPlayer } from "@dashhaus/core";
import { usePicture } from "@dashhaus/core/hooks";
import { mediaLine, mediaPlayerWord, mediaPress, pressWord } from "@dashhaus/core/entities/mediaPlayer/words";

/**
 * What is playing, its artwork, and one button that does what the player can do now: pause it while it plays (or stop
 * it, where it can't pause), play it while it doesn't, turn it on while it is off. What it can do comes from what it declares to Home Assistant.
 */
export function NowPlaying({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaMediaPlayer(entityId, { loadHistory: false });
  const artwork = usePicture<HTMLSpanElement>(entity.picture);
  const press = mediaPress(entity);
  const run = { play: actions.onPlay, pause: actions.onPause, stop: actions.onStop, turnOn: actions.onTurnOn, turnOff: actions.onTurnOff };

  return (
    <figure>
      <span ref={artwork.ref} style={{ display: "block", width: 96, height: 96 }}>
        {artwork.src && <img src={artwork.src} alt="" width={96} height={96} />}
      </span>
      <figcaption>
        {mediaLine(entity) ?? mediaPlayerWord(entity)}
        {press && <button type="button" onClick={run[press]}>{pressWord(press)}</button>}
      </figcaption>
    </figure>
  );
}
