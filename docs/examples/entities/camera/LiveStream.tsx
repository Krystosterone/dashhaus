import { useHaMoreInfo } from "@dashhaus/core";

/** Inside Home Assistant, Home Assistant's own live stream; elsewhere, your own details. */
export function WatchNursery({ openDetails }: { openDetails: () => void }) {
  const openLive = useHaMoreInfo("camera.nursery");
  return <button type="button" onClick={openLive ?? openDetails}>Watch the nursery</button>;
}
