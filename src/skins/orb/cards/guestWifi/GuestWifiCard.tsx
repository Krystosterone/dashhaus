import { useState } from "react";
import type { GuestWifiEntity } from "@dashhaus/core/entities/guestWifi/types";
import { NEW_PASSWORD_ACTION, NEW_PASSWORD_HINT, NEW_PASSWORD_WAITING, NONE_HINT, NO_QR, isGroupedCode, joinWords, lastsWords, madeFact, qrFailedWords, newPasswordQuestion, newSecretWords, noneSentence, noneWord, secretWord, spokenCode, usesWords } from "@dashhaus/core/entities/guestWifi/words";
import { ACTION_FAILED } from "@dashhaus/core/entities/guard";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { useGuardedAction } from "@dashhaus/core/primitives";
import { GuestWifiIcon } from "./icons";
import { CardFrame, Confirm, FeaturedEmpty, Readout, SheetBlock, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./GuestWifiCard.css";

export interface GuestWifiCardProps extends CardProps {
  entity: GuestWifiEntity;
  /** Card only: the name and the code open the details sheet. */
  onOpenDetails?: () => void;
  /** Sheet only: fetch the code again now. Answers once Home Assistant has. Omit to hide it. */
  onRefresh?: () => Promise<void>;
  /** Sheet only: make a new code or password (a password asks first). Answers once Home Assistant has. Omit to hide it. */
  onNewCode?: () => Promise<void>;
}

/** Which press is waiting for Home Assistant, so its pill can say so. */
type Pending = "refresh" | "new" | null;

const capital = (word: string) => word[0].toUpperCase() + word.slice(1);

/**
 * A guest Wi-Fi network and what a guest types to use it, a code its page asks for or its password: a reading. A bare
 * icon, the code as a readout with no container, and no glow. The status line names the network to join. Featured,
 * the card carries the network's join QR code, so a guest can scan it from a wall panel (with none, it says No QR
 * code in its place); the sheet draws it large,
 * with what the code allows and the two presses its host gives, Refresh and New code (or New password, which asks
 * first, since devices already joined then need it). Neither is on the card: a stray tap on a dashboard never makes
 * codes. A long password shrinks to fit the card and is shown whole, wrapping, in the sheet.
 */
export function GuestWifiCard({ entity: e, variant, footprint, showControl, onOpenDetails, onClose, onRefresh, onNewCode }: GuestWifiCardProps) {
  const card = useCard("gw", { variant, footprint, showControl, area: e.area });
  const { sheet, featured, nameId } = card;
  const [pending, setPending] = useState<Pending>(null);
  // The QR code that failed to load, by its URL, so a rotated token's new one is tried afresh.
  const [failedQr, setFailedQr] = useState<string>();
  const unav = e.state === "unavailable";
  const ready = e.state === "ready" && e.code != null;
  const password = e.access === "password";
  // A new password asks first (`GUEST_WIFI_ACTIONS` declares it, for a password): the sheet's question, then the press.
  const guard = useGuardedAction<"new">({ run: () => onNewCode?.(), needsCode: () => false, disabled: !onNewCode || unav });
  const secret = secretWord(e);
  const colors = paint("reading", 0);

  const terms = ready ? [usesWords(e), lastsWords(e)].filter(Boolean).join(" · ") : "";
  const none = noneWord(e);
  const text = unav ? "Unavailable" : ready ? e.code! : none;
  const spoken = ready ? `${secret} ${spokenCode(e.code!)}` : none.toLowerCase();
  const status = unav ? "Unavailable" : e.network ?? card.area;
  // A voucher's ten digits fit the card at the readout's size; free text shrinks, and past that is cut, whole in the sheet.
  const long = ready && (!isGroupedCode(e.code!) || e.code!.length > 13) ? "" : undefined;

  const bar = (
    <span className="hd-bar gw-bar">
      {ready
        ? <span className="hd-metric"><span className="hd-label">{capital(secret)}</span><span className="gw-code" data-long={long}>{e.code}</span></span>
        : <span className="hd-none">{none}</span>}
    </span>
  );

  // One press at a time: its pill says it is waiting until Home Assistant answers, by when the code has come in.
  const press = (which: Exclude<Pending, null>, action?: () => Promise<void>) => action && (() => {
    if (pending) return;
    setPending(which);
    void action().finally(() => setPending(null));
  });
  const refresh = press("refresh", onRefresh);
  const make = press("new", onNewCode);
  // What the note says while nothing is waiting: what a new code does to the old ones, and that a password asks first.
  const idle = make ? [newSecretWords(e), password && NEW_PASSWORD_HINT].filter(Boolean).join(" ") : "";

  // The join QR code: on the featured card for a guest to scan where they stand, and large in the sheet.
  // One that fails to load draws its frame empty, never the browser's broken picture, and its line says so.
  const qr = ready ? e.qr : undefined;
  const qrFailed = qr != null && failedQr === qr;
  // A code Home Assistant gives with no QR code: the featured card says so in the QR code's place, with no frame. With
  // no code at all the slot already says No code, and the line under it where to make one.
  const noQr = featured && ready && !qr;
  const join = (featured || sheet) && !unav && (
    <div className="gw-join" data-qr={qr ? "" : undefined} data-failed={qrFailed ? "" : undefined} data-empty={noQr ? "" : undefined}>
      {noQr && <FeaturedEmpty>{NO_QR}</FeaturedEmpty>}
      {qr && (qrFailed
        ? <span className="gw-qr" aria-hidden="true" />
        : <img className="gw-qr" src={qr} alt={`QR code to join ${e.network ?? "the network"}`} draggable={false} onError={() => setFailedQr(qr)} />)}
      <p className="gw-how">
        {/* The sheet has New code under it; the card, whose slot already says there is none, says where to find it. */}
        {ready ? (qrFailed ? qrFailedWords(e) : joinWords(e)) : sheet ? noneSentence(e) : `${NONE_HINT}.`}
        {featured && terms && <span className="gw-terms">{terms}</span>}
      </p>
    </div>
  );

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, ...colors }}
      glyph={<GuestWifiIcon />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={status}
      value={text}
      onClose={onClose}
      control={sheet || !onOpenDetails ? <Readout label={spoken}>{bar}</Readout>
        : <Readout label={`${e.name}: ${spoken}`} onOpen={onOpenDetails}>{bar}</Readout>}
      // When first (it last reported, or was last seen), then its code: when that was made.
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: unav ? "" : madeFact(e.created) }}
    >
      {join}
      <SheetBlock>
        {!unav && (refresh || make || terms) && (guard.pending === "new" ? (
          // A new password ends the old one for every device already in, so it asks first, as the lock's unlock does.
          <Confirm
            question={newPasswordQuestion(e)}
            detail={newSecretWords(e)}
            action={NEW_PASSWORD_ACTION}
            busy={guard.busy}
            waiting={NEW_PASSWORD_WAITING}
            error={guard.failed ? ACTION_FAILED : null}
            onConfirm={() => void guard.confirm()}
            onCancel={guard.close}
          />
        ) : (
          <section className="hd-blk gw-codes" aria-labelledby={`${nameId}-c`}>
            <h3 className="hd-blk-h" id={`${nameId}-c`}>{password ? "Wi-Fi password" : "Codes"}{terms && <span className="hd-blk-v">{terms}</span>}</h3>
            {(refresh || make) && (
              <div className="gw-acts">
                {refresh && <TogglePill label={pending === "refresh" ? `Checking the ${secret}` : `Refresh ${e.name}'s ${secret}`} onToggle={refresh}>{pending === "refresh" ? "Checking…" : "Refresh"}</TogglePill>}
                {make && (
                  <TogglePill label={pending === "new" ? `Making a new ${secret}` : `Make a new ${secret} for ${e.name}${password ? "…" : ""}`} onToggle={password ? () => guard.ask("new") : make}>
                    {pending === "new" ? "Making…" : `New ${secret}${password ? "…" : ""}`}
                  </TogglePill>
                )}
              </div>
            )}
            {/* The idle words also hold their room, hidden, under what it says while waiting, so the sheet never moves. */}
            <p className="gw-note">
              <span role="status">{pending === "new" ? `Making a new ${secret}…` : pending === "refresh" ? `Checking the ${secret}…` : idle}</span>
              <span className="gw-note-room" aria-hidden="true">{idle}</span>
            </p>
          </section>
        ))}
      </SheetBlock>
    </CardFrame>
  );
}

export type GuestWifiSheetProps = SheetProps<GuestWifiCardProps>;

export const GuestWifiSheet = detailsSheet(GuestWifiCard);
