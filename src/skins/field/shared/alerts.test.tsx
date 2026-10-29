import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AlertLine, AlertsProvider } from "./alerts";
import type { Pressing } from "./alerts";
import { ModuleFrame, useDetails } from "./ui";

function Probe({ name, level, what }: { name: string; level?: Pressing; what?: string }) {
  const details = useDetails();
  return (
    <ModuleFrame
      kind="fd-zz"
      name={name}
      state="on"
      details={details}
      alert={level && what ? { level, what, say: `Alarm: ${name}, ${what}.` } : undefined}
      pict={null}
      read="ON"
      lead={null}
      row={null}
    >
      <p>{name} inside</p>
    </ModuleFrame>
  );
}

const line = () => screen.queryByRole("region", { name: "Alerts" });
const entries = () => within(line()!).getAllByRole("button").map((b) => b.textContent);

describe("the alert line", () => {
  // jsdom has no modal dialog; these do what a browser's do to the `open` attribute.
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  });

  it("shows nothing while nothing is pressing", () => {
    render(<AlertsProvider><AlertLine /><Probe name="Hall" /></AlertsProvider>);
    expect(line()).toBeNull();
  });

  it("lists what its modules report, alarms first, and a tap opens that module's details", () => {
    render(
      <AlertsProvider>
        <AlertLine />
        <Probe name="Garage door" level="urgent" what="Open at night" />
        <Probe name="Nova" level="alarm" what="Critical oxygen 79%" />
      </AlertsProvider>,
    );
    expect(entries()).toEqual(["AlarmAlarm: Nova · Critical oxygen 79%", "UrgentUrgent: Garage door · Open at night"]);
    fireEvent.click(within(line()!).getAllByRole("button")[0]);
    expect(screen.getByRole("dialog", { name: "Nova details" }).textContent).toContain("Nova inside");
  });

  it("shows three, then how many more, and drops a module's entry once it clears", () => {
    const four = (cleared?: boolean) => (
      <AlertsProvider>
        <AlertLine />
        {["A", "B", "C"].map((n) => <Probe key={n} name={n} level="urgent" what="Sock off" />)}
        <Probe name="D" level={cleared ? undefined : "urgent"} what="Sock off" />
      </AlertsProvider>
    );
    const { rerender } = render(four());
    expect(entries()).toHaveLength(4);
    expect(entries()[3]).toBe("+1 more");
    fireEvent.click(screen.getByRole("button", { name: "+1 more" }));
    expect(entries()).toHaveLength(5);
    act(() => rerender(four(true)));
    expect(entries()).toHaveLength(3);
  });

  it("draws the level on the module, and announces an alarm", () => {
    const { container } = render(<Probe name="Nova" level="alarm" what="Low oxygen" />);
    expect(container.querySelector(".fd-module")?.getAttribute("data-level")).toBe("alarm");
    expect(screen.getByRole("alert").textContent).toBe("Alarm: Nova, Low oxygen.");
  });
});
