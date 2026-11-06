import { useState } from "react";
import { useHaSelector, useHaStore } from "../index";
import { actionMessage } from "./actionMessage";
import type { ActionMessage } from "./actionMessage";

/** The latest rejected command, as a recovery row draws it: its words, and what the row's buttons do. */
export interface ActionStatus extends ActionMessage {
  /** Repeating the command is safe: the store still holds it and the connection is up. */
  canRetry: boolean;
  /** A retry is in flight; the row disables its Retry button. */
  retrying: boolean;
  /** Send the rejected command again. A second rejection replaces the status. */
  retry(): void;
  /** Clear the status until the next rejection. */
  dismiss(): void;
}

/**
 * The store's latest rejected service call, ready for a skin's recovery row: the words from `actionMessage`, Retry when
 * it is safe and Dismiss. Every card's action goes through the store, so a row mounted once on the page covers every
 * card; null when nothing was rejected. It needs an `HaProvider` above it. The row's markup is the skin's own.
 */
export function useActionStatus(): ActionStatus | null {
  const store = useHaStore();
  const error = useHaSelector((snapshot) => snapshot.lastActionError);
  const entity = useHaSelector((snapshot) => (error?.entityId ? snapshot.entities[error.entityId] : undefined));
  const [retrying, setRetrying] = useState(false);
  const canRetry = store.canRetryLastAction?.() === true;
  const message = actionMessage(error, entity, canRetry);
  if (!message) return null;
  return {
    ...message,
    canRetry,
    retrying,
    retry() {
      setRetrying(true);
      void store.retryLastAction?.().catch(() => undefined).finally(() => setRetrying(false));
    },
    dismiss: () => store.clearActionError?.(),
  };
}
