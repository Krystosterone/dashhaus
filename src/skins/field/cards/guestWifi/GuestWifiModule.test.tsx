import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GuestWifiModule } from "./GuestWifiModule";
import { GUEST_WIFI_SEEDS } from "@dashhaus/core/seeds/guestWifi";

const { entity } = GUEST_WIFI_SEEDS.ready;

describe("GuestWifiModule", () => {
  it("is a reading: its glyph on a flat plate, nothing pressed on the module", () => {
    const { container } = render(<GuestWifiModule entity={entity} onNewCode={() => Promise.resolve()} onRefresh={() => Promise.resolve()} />);
    expect(container.querySelector(".fd-module .fd-glyph")).not.toBeNull();
    expect(container.querySelector(".fd-module .fd-key")).toBeNull();
  });

  it("shows the code on the screen, heard a digit at a time, and prints the network on the plate", () => {
    const { container } = render(<GuestWifiModule entity={entity} />);
    expect(container.querySelector(".fd-module .fd-gw-gs")?.textContent).toBe("9866849366");
    expect(container.querySelector(".fd-module .fd-sr")?.textContent).toBe("Code 9 8 6 6 8, 4 9 3 6 6");
    expect(container.querySelector(".fd-gw-ssid")?.textContent).toBe("Maple Guests");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Single useLasts 1 day");
  });

  it("prints the network on a compact row's line", () => {
    const { container } = render(<GuestWifiModule entity={entity} footprint="compact" />);
    expect(container.querySelector(".fd-area")?.textContent).toBe("Maple Guests");
  });

  it("puts the join QR code and the keys in the panel, waiting on one press at a time", async () => {
    let answer!: () => void;
    const onNewCode = vi.fn(() => new Promise<void>((resolve) => { answer = resolve; }));
    const onRefresh = vi.fn(() => Promise.resolve());
    render(<GuestWifiModule entity={entity} onNewCode={onNewCode} onRefresh={onRefresh} defaultOpen />);
    expect(screen.getByRole("img", { name: "QR code to join Maple Guests" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Make a new code for Guest Wi-Fi" }));
    expect(onNewCode).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("Making a new code.");
    fireEvent.click(screen.getByRole("button", { name: "Refresh Guest Wi-Fi's code" }));
    expect(onRefresh).not.toHaveBeenCalled();
    await act(async () => answer());
    expect(screen.getByRole("status").textContent).toBe("The codes already given keep working.");
  });

  it("shows a password as it is typed, case and all, and asks before making a new one", async () => {
    const onNewCode = vi.fn(() => Promise.resolve());
    const { container } = render(<GuestWifiModule entity={GUEST_WIFI_SEEDS.password.entity} onNewCode={onNewCode} defaultOpen />);
    expect(container.querySelector(".fd-module .fd-gw-t")?.textContent).toBe("ripe-Mango-sunset-42");
    expect(container.querySelector(".fd-module .fd-sr")?.textContent).toBe("Password r i p e dash capital M a n g o dash s u n s e t dash 4 2");
    fireEvent.click(screen.getByRole("button", { name: "Make a new password for Guest Wi-Fi: asks first" }));
    expect(onNewCode).not.toHaveBeenCalled();
    // The question takes no press for its first 400 ms, so a double tap can't answer it.
    await act(() => new Promise((resolve) => setTimeout(resolve, 450)));
    fireEvent.click(screen.getByRole("button", { name: "Change the password for Maple Guests 5G" }));
    await act(async () => {});
    expect(onNewCode).toHaveBeenCalledTimes(1);
  });

  it("blanks the screen while unavailable, says when it was last seen, and offers nothing to press", () => {
    const { container } = render(<GuestWifiModule entity={GUEST_WIFI_SEEDS.unavailable.entity} onNewCode={() => Promise.resolve()} defaultOpen />);
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
    expect(screen.queryByRole("button", { name: /new code/i })).toBeNull();
  });

  it("says there is no code, and offers a new one in the panel", () => {
    render(<GuestWifiModule entity={GUEST_WIFI_SEEDS.none.entity} onNewCode={() => Promise.resolve()} defaultOpen />);
    expect(screen.queryByRole("img", { name: /QR code/ })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Every code has been used. Make a new one to give.");
  });
});
