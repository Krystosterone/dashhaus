import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GuestWifiCard } from "./GuestWifiCard";
import type { GuestWifiEntity } from "@dashhaus/core/entities/guestWifi/types";

const entity: GuestWifiEntity = {
  entityId: "sensor.maple_voucher", name: "Guest Wi-Fi", area: "Hall", state: "ready", access: "code", network: "Maple Guests",
  code: "98668-49366", qr: "data:image/svg+xml,qr", allowed: 1, used: 0, lastsMinutes: 1440, created: "Mon 18:02", lastUpdated: "11:52",
};

describe("GuestWifiCard", () => {
  it("is a reading: no glow, a bare icon, its class prefix", () => {
    const { container } = render(<GuestWifiCard entity={entity} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd gw");
    expect(container.querySelector(".hd-orb--static")).not.toBeNull();
  });

  it("names the network on the status line and reads the code a digit at a time", () => {
    const onOpenDetails = vi.fn();
    const { container } = render(<GuestWifiCard entity={entity} onOpenDetails={onOpenDetails} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Maple Guests");
    screen.getByRole("button", { name: "Guest Wi-Fi: code 9 8 6 6 8, 4 9 3 6 6. Open details" }).click();
    expect(onOpenDetails).toHaveBeenCalled();
  });

  it("carries the join QR code only where there is room to scan it: featured and the sheet", () => {
    const { rerender } = render(<GuestWifiCard entity={entity} />);
    expect(screen.queryByRole("img", { name: "QR code to join Maple Guests" })).toBeNull();
    rerender(<GuestWifiCard entity={entity} footprint="featured" />);
    expect(screen.getByRole("img", { name: "QR code to join Maple Guests" })).toBeTruthy();
    expect(screen.getByText("Single use · Lasts 1 day")).toBeTruthy();
    rerender(<GuestWifiCard entity={entity} variant="sheet" />);
    expect(screen.getByRole("img", { name: "QR code to join Maple Guests" })).toBeTruthy();
    expect(screen.getByText("Join Maple Guests, then enter the code on the page that opens.")).toBeTruthy();
  });

  it("keeps Refresh and New code in the sheet, never on the card", () => {
    const onNewCode = vi.fn(() => Promise.resolve());
    const { rerender } = render(<GuestWifiCard entity={entity} onNewCode={onNewCode} footprint="featured" />);
    expect(screen.queryByRole("button", { name: /new code/i })).toBeNull();
    rerender(<GuestWifiCard entity={entity} onNewCode={onNewCode} variant="sheet" />);
    const pill = screen.getByRole("button", { name: "Make a new code for Guest Wi-Fi" });
    expect(pill.getAttribute("aria-pressed")).toBeNull();
  });

  it("says it is waiting until Home Assistant answers, one press at a time", async () => {
    let answer!: () => void;
    const onNewCode = vi.fn(() => new Promise<void>((resolve) => { answer = resolve; }));
    const onRefresh = vi.fn(() => Promise.resolve());
    render(<GuestWifiCard entity={entity} onNewCode={onNewCode} onRefresh={onRefresh} variant="sheet" />);
    fireEvent.click(screen.getByRole("button", { name: "Make a new code for Guest Wi-Fi" }));
    expect(screen.getByRole("status").textContent).toBe("Making a new code…");
    fireEvent.click(screen.getByRole("button", { name: "Refresh Guest Wi-Fi's code" }));
    expect(onRefresh).not.toHaveBeenCalled();
    await act(async () => answer());
    expect(screen.getByRole("status").textContent).toBe("The codes already given keep working.");
  });

  it("says there is no code to give, and offers a new one in the sheet", () => {
    const none: GuestWifiEntity = { ...entity, state: "none", code: undefined, allowed: undefined, used: undefined, lastsMinutes: undefined };
    const { container, rerender } = render(<GuestWifiCard entity={none} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("No code");
    // The featured card says where New code is, in the details, under the slot that says there is none: never twice.
    rerender(<GuestWifiCard entity={none} footprint="featured" />);
    expect(container.querySelector(".hd-none")?.textContent).toBe("No code");
    expect(container.querySelector(".gw-how")?.textContent).toBe("Make one in details.");
    rerender(<GuestWifiCard entity={none} variant="sheet" onNewCode={() => Promise.resolve()} />);
    expect(screen.queryByRole("img", { name: /QR code/ })).toBeNull();
    expect(screen.getByText("Every code has been used. Make a new one to give.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Make a new code for Guest Wi-Fi" })).toBeTruthy();
  });

  it("says a password, read every character, and asks before making a new one", async () => {
    const onNewCode = vi.fn(() => Promise.resolve());
    const password: GuestWifiEntity = { entityId: "input_text.guest", name: "Guest Wi-Fi", state: "ready", access: "password", network: "Maple Guests 5G", code: "ripe-Mango-42" };
    const { container } = render(<GuestWifiCard entity={password} onNewCode={onNewCode} variant="sheet" />);
    expect(container.querySelector(".hd-label")?.textContent).toBe("Password");
    expect(screen.getByRole("img", { name: "password r i p e dash capital M a n g o dash 4 2" })).toBeTruthy();
    expect(screen.getByText("Choose Maple Guests 5G in Wi-Fi settings and type the password.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Make a new password for Guest Wi-Fi…" }));
    expect(onNewCode).not.toHaveBeenCalled();
    expect(screen.getByText("Change the password for Maple Guests 5G?")).toBeTruthy();
    // The question takes no press for its first 400 ms, so a double tap can't answer it.
    await act(() => new Promise((resolve) => setTimeout(resolve, 450)));
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    await act(async () => {});
    expect(onNewCode).toHaveBeenCalledTimes(1);
  });

  it("shrinks a password that isn't a voucher's digits, and cuts it only on the card", () => {
    const long: GuestWifiEntity = { entityId: "input_text.guest", name: "Guest Wi-Fi", state: "ready", access: "password", code: "Correct-Horse-Battery-Staple" };
    const { container } = render(<GuestWifiCard entity={long} />);
    expect(container.querySelector(".gw-code")?.hasAttribute("data-long")).toBe(true);
    expect(render(<GuestWifiCard entity={entity} />).container.querySelector(".gw-code")?.hasAttribute("data-long")).toBe(false);
  });

  it("hides the code and the QR code while unavailable", () => {
    const { container } = render(<GuestWifiCard entity={{ ...entity, state: "unavailable", lastSeen: "08:20" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Unavailable");
    expect(screen.queryByText("98668-49366")).toBeNull();
  });

  it("draws a QR code that fails to load as an empty frame, says so, and tries a new one afresh", () => {
    const { container, rerender } = render(<GuestWifiCard entity={entity} footprint="featured" />);
    fireEvent.error(screen.getByRole("img", { name: "QR code to join Maple Guests" }));
    expect(screen.queryByRole("img", { name: /QR code/ })).toBeNull();
    expect(container.querySelector("span.gw-qr")).not.toBeNull();
    expect(container.querySelector(".gw-how")?.textContent).toMatch(/^No QR code. Join Maple Guests, then enter the code on the page that opens./);
    rerender(<GuestWifiCard entity={{ ...entity, qr: "data:image/svg+xml,next" }} footprint="featured" />);
    expect(screen.getByRole("img", { name: "QR code to join Maple Guests" })).not.toBeNull();
  });
});
