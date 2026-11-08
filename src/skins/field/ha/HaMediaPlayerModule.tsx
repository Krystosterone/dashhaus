import { useHaMediaPlayer } from "@dashhaus/core";
import type { HaMediaPlayerOptions } from "@dashhaus/core";
import { MediaPlayerModule } from "../cards/mediaPlayer/MediaPlayerModule";
import type { MediaPlayerModuleProps } from "../cards/mediaPlayer/MediaPlayerModule";

export interface HaMediaPlayerModuleProps extends HaMediaPlayerOptions, Pick<MediaPlayerModuleProps, "footprint" | "quiet" | "defaultOpen"> {
  entityId: string;
}

/** A live media player module: the useHaMediaPlayer hook above field's module. `quiet` is the dashboard's: no progress rule and no running clock. */
export function HaMediaPlayerModule({ entityId, footprint, quiet, defaultOpen, ...options }: HaMediaPlayerModuleProps) {
  const { entity, history, actions } = useHaMediaPlayer(entityId, options);
  return (
    <MediaPlayerModule
      entity={entity}
      history={history}
      onPlay={actions.onPlay} onPause={actions.onPause} onPrevious={actions.onPrevious} onNext={actions.onNext} onTurnOn={actions.onTurnOn} onTurnOff={actions.onTurnOff} onVolumeChange={actions.onVolumeChange} onSourceChange={actions.onSourceChange} onMuteChange={actions.onMuteChange}
      footprint={footprint}
      quiet={quiet}
      defaultOpen={defaultOpen}
    />
  );
}
