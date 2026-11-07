/**
 * The domain icon, every compact row's identity (row-identity skill): a player's face with the play mark, whatever it
 * plays through (a speaker, a TV, a cast). Its shape never changes with its state: the pill and the words say that.
 */
export function MediaPlayerIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      <rect x="3" y="4" width="14" height="12" rx="3" />
      <path d="M8.6 7.6v4.8l4-2.4Z" />
    </svg>
  );
}
