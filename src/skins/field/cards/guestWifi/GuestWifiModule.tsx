import { useState } from "react";
import type { ReactNode } from "react";
import type { GuestWifiEntity } from "@dashhaus/core/entities/guestWifi/types";
import { NEW_PASSWORD_ACTION, NEW_PASSWORD_HINT, NEW_PASSWORD_WAITING, NONE_HINT, codeGroups, isGroupedCode, joinWords, madeFact, qrFailedWords, newPasswordLabel, newPasswordQuestion, newSecretWords, noneSentence, noneWord, secretWord, shortTerms, spokenCode } from "@dashhaus/core/entities/guestWifi/words";
import { ACTION_FAILED } from "@dashhaus/core/entities/guard";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { useGuardedAction } from "@dashhaus/core/primitives";
import { Blank, Confirm, Glyph, Key, KeyGroup, Legend, ModuleFrame, ModuleRow, Pictogram, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { GUEST_WIFI_PICT, IconGuestWifi, IconNewCode, IconRefresh } from "./icons";
import "./GuestWifiModule.css";

export interface GuestWifiModuleProps {
  entity: GuestWifiEntity;
  footprint?: FieldFootprint;
  /** Panel only: fetch the code again now. Answers once Home Assistant has. Omit to leave it out. */
  onRefresh?: () => Promise<void>;
  /** Panel only: make a new code or password (a password asks first). Answers once Home Assistant has. Omit to leave it out. */
  onNewCode?: () => Promise<void>;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** Which press is waiting for Home Assistant, so its key can say so. */
type Pending = "refresh" | "new" | null;

const capital = (word: string) => word[0].toUpperCase() + word.slice(1);

/**
 * A guest Wi-Fi network and what a guest types to use it, a code its page asks for or its password, as a field module:
 * a reading, so nothing on it is pressed but its name. Where a control has its key and fader, it has its glyph on a
 * flat plate and the network's name printed on the plate, as on a router's label. The screen shows a voucher's code
 * in its digit groups, or a password as it is typed, case and all (cut on the module, whole in the panel); the meta
 * lines say a code's uses and length. A compact row stacks a code's two groups on its screen and prints the network on
 * the area's line. The name opens the panel: the network's join QR code printed on the plate where its host has one,
 * how to join, and the two keys its host gives, Refresh and New code (New password asks first, since devices already
 * joined then need it); never on the module, so a stray press never makes codes.
 */
export function GuestWifiModule({ entity: e, footprint = "standard", onRefresh, onNewCode, defaultOpen = false }: GuestWifiModuleProps) {
  const details = useDetails(defaultOpen);
  const [pending, setPending] = useState<Pending>(null);
  // The QR code that failed to load, by its URL, so a rotated token's new one is tried afresh.
  const [failedQr, setFailedQr] = useState<string>();
  const unav = e.state === "unavailable";
  const ready = e.state === "ready" && e.code != null;
  const password = e.access === "password";
  // A new password asks first (`GUEST_WIFI_ACTIONS` declares it, for a password): the panel's question, then the press.
  const guard = useGuardedAction<"new">({ run: () => onNewCode?.(), needsCode: () => false, disabled: !onNewCode || unav });
  const secret = secretWord(e);
  const qrFailed = e.qr != null && failedQr === e.qr;

  const pict = <Pictogram param="neutral" lit={ready}>{GUEST_WIFI_PICT}</Pictogram>;
  const figure = (code: string) => (
    <span className="fd-gw-code" data-text={isGroupedCode(code) ? undefined : ""}>
      {isGroupedCode(code)
        ? <span className="fd-gw-gs" aria-hidden="true">{codeGroups(code).map((group, i) => <span key={i} className="fd-gw-g">{group}</span>)}</span>
        : <span className="fd-gw-t" aria-hidden="true">{code}</span>}
      <span className="fd-sr">{capital(secret)} {spokenCode(code)}</span>
    </span>
  );
  // Nothing to give is a known resting state, so the screen names it in the dim ink (`NONE`), never blank segments;
  // unavailable it can't say, so they are blank.
  const read: ReactNode = ready ? figure(e.code!) : unav ? <Blank places={4} label="Unavailable" />
    : <><span aria-hidden="true">NONE</span><span className="fd-sr">{noneWord(e)}</span></>;
  // The screen's room is short: "3 of 5 left", "18 h left"; the panel's words say them in full.
  const [first = capital(secret), second] = ready ? shortTerms(e) : [];
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : !ready ? [noneWord(e), NONE_HINT]
    : [first, second];
  const glyph = <Glyph unavailable={unav}><IconGuestWifi /></Glyph>;

  // One press at a time: its key lies flat and says it is waiting until Home Assistant answers.
  const press = (which: Exclude<Pending, null>, action?: () => Promise<void>) => action && (() => {
    if (pending) return;
    setPending(which);
    void action().finally(() => setPending(null));
  });
  const refresh = press("refresh", onRefresh);
  const make = press("new", onNewCode);

  return (
    <ModuleFrame
      kind="fd-gw"
      name={e.name}
      area={e.area}
      line={unav ? undefined : e.network ?? e.area}
      footprint={footprint}
      state={e.state}
      // Nothing to give, a known resting state: NONE at the figure's own size, in the dim ink.
      rest={e.state === "none"}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={glyph}
      row={(
        <ModuleRow className="fd-gw-row">
          {glyph}
          <div className="fd-gw-net" data-none={unav || !e.network || undefined}>
            <Legend>Network</Legend>
            <span className="fd-gw-ssid">{unav ? "Unavailable" : e.network ?? "Not named"}</span>
          </div>
        </ModuleRow>
      )}
      // When first (it last reported, or was last seen), then its code: when that was made.
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: unav ? "" : madeFact(e.created) }}
    >
      {ready && (
        <div className="fd-block">
          <Legend>{e.qr && !qrFailed ? "Scan to join" : "Join"}</Legend>
          <div className="fd-gw-join">
            {/* One that fails to load prints its frame empty, never the browser's broken picture, and its line says so. */}
            {e.qr && (qrFailed
              ? <span className="fd-gw-qr" aria-hidden="true" />
              : <img className="fd-gw-qr" src={e.qr} alt={`QR code to join ${e.network ?? "the network"}`} draggable={false} onError={() => setFailedQr(e.qr)} />)}
            <p className="fd-hint">{qrFailed ? qrFailedWords(e) : joinWords(e)}</p>
          </div>
        </div>
      )}
      {!unav && (refresh || make) && (guard.pending === "new" ? (
        // A new password ends the old one for every device already in, so it asks first, as the lock's unlock does.
        <Confirm
          question={newPasswordQuestion(e)}
          detail={newSecretWords(e)}
          action={NEW_PASSWORD_ACTION}
          actionLabel={newPasswordLabel(e)}
          icon={<IconNewCode />}
          busy={guard.busy}
          waiting={NEW_PASSWORD_WAITING}
          error={guard.failed ? ACTION_FAILED : null}
          onConfirm={() => void guard.confirm()}
          onCancel={guard.close}
        />
      ) : (
        <div className="fd-block">
          <KeyGroup legend={password ? "Password" : "Codes"} columns={refresh && make ? 2 : 1}>
            {refresh && (
              <Key label={pending === "refresh" ? `Checking the ${secret}` : `Refresh ${e.name}'s ${secret}`} wide caption={pending === "refresh" ? "Checking" : "Refresh"} unavailable={pending != null} onPress={refresh}>
                <IconRefresh />
              </Key>
            )}
            {make && (
              <Key
                label={pending === "new" ? `Making a new ${secret}` : `Make a new ${secret} for ${e.name}${password ? ": asks first" : ""}`}
                wide
                caption={pending === "new" ? "Making" : `New ${secret}`}
                unavailable={pending != null}
                onPress={password ? () => guard.ask("new") : make}
              >
                <IconNewCode />
              </Key>
            )}
          </KeyGroup>
          <p className="fd-hint" role="status">
            {pending === "new" ? `Making a new ${secret}.` : pending === "refresh" ? `Checking the ${secret}.`
              : !ready ? noneSentence(e)
              : make ? [newSecretWords(e), password && NEW_PASSWORD_HINT].filter(Boolean).join(" ") : ""}
          </p>
        </div>
      ))}
    </ModuleFrame>
  );
}
