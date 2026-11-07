import { useHaCamera } from "@dashhaus/core";
import { usePicture } from "@dashhaus/core/hooks";
import { cameraWord, stillNote } from "@dashhaus/core/entities/camera/words";

/** The front door's still, refreshed every 10 seconds while it is on screen, with what the camera is doing. */
export function FrontDoor() {
  const { entity } = useHaCamera("camera.front_door");
  const still = usePicture<HTMLDivElement>(entity.picture, { refresh: 10_000 });
  return (
    <figure>
      <div ref={still.ref} style={{ aspectRatio: "16 / 9", background: "#ddd" }}>
        {still.src && <img src={still.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      <figcaption>{entity.name}: {cameraWord(entity)} {stillNote(entity, still) ?? ""}</figcaption>
    </figure>
  );
}
