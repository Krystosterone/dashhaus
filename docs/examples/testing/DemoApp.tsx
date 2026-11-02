import { HaProvider } from "@dashhaus/core";
import { createDemoCoverHaTransport, createDemoStore } from "@dashhaus/core/demo";
import { HaCoverTile } from "@dashhaus/orb";

/** The whole demo house, as Storybook and the docs' live dashboards run it. */
export const house = createDemoStore();

/** One domain's demo on its own: a smaller seed, for a story or a test about covers. */
export const covers = createDemoStore(createDemoCoverHaTransport());

export function CoverPlayground() {
  return (
    <HaProvider store={covers}>
      <HaCoverTile entityId="cover.living_room" />
    </HaProvider>
  );
}
