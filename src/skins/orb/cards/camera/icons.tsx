import type { CameraState } from "@dashhaus/core/entities/camera/types";

/**
 * The domain icon, a camera on its mount, every compact row's identity (row-identity skill). It says its state without
 * colour: a filled dot beside the lens while it records, waves out from it while it streams, the body alone while idle.
 */
export function CameraIcon({ state = "idle" }: { state?: CameraState }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      <rect x="2.5" y="5.5" width="11" height="8" rx="2" />
      <circle cx="8" cy="9.5" r="2" />
      <path d="M13.5 8.5l3-1.8v5.6l-3-1.8" />
      <path d="M8 13.5v2.5M5.5 16h5" />
      {state === "recording" && <circle cx="4.9" cy="7.7" r="0.9" fill="currentColor" stroke="none" />}
      {state === "streaming" && <path d="M16.3 3.4a3.2 3.2 0 0 1 1.4 1.9M15.6 1.8a5 5 0 0 1 3 2.6" />}
    </svg>
  );
}
