import { HaMediaPlayer, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";
import { mediaLine, mediaPlayerWord } from "@dashhaus/core/entities/mediaPlayer/words";

const playerIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("media_player.")).sort().join(" ");

/** Every speaker and TV in the house, what it is doing, and what is playing on it. */
export function AllPlayers() {
  const ids = useHaSelector(playerIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaMediaPlayer entityId={id} loadHistory={false}>
            {({ entity }) => (
              <>
                {entity.name}: {mediaPlayerWord(entity)}
                {mediaLine(entity) ? `, ${mediaLine(entity)}` : ""}
              </>
            )}
          </HaMediaPlayer>
        </li>
      ))}
    </ul>
  );
}
