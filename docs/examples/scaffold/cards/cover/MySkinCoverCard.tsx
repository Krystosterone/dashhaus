import { Action } from "../../shared/ui";

const CARD_CODE = "cv";

export interface MySkinCoverCardProps {
  name: string;
  area?: string;
  /** 0 closed, 100 open; absent for a cover that only opens and closes. */
  position?: number;
  state: "open" | "closed" | "opening" | "closing" | "unavailable";
  onOpen: () => void;
  onClose: () => void;
}

/** One cover: its name, its room, how open it is, and a button for the way it isn't going. */
export function MySkinCoverCard({ name, area, position, state, onOpen, onClose }: MySkinCoverCardProps) {
  const unavailable = state === "unavailable";
  const open = state === "open" || state === "opening";
  const reading = unavailable ? "—" : position == null ? state : `${position}% open`;
  return (
    <article className="my-skin-cv-card" data-card-code={CARD_CODE} data-state={state}>
      <header className="my-skin-cv-head">
        <h3 className="my-skin-cv-name">{name}</h3>
        <p className="my-skin-cv-area">{area ?? "No area"}</p>
      </header>
      <p className="my-skin-cv-reading">{reading}</p>
      <Action label={open ? "Close" : "Open"} onPress={open ? onClose : onOpen} unavailable={unavailable} />
    </article>
  );
}
