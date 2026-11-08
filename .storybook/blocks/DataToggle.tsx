/**
 * The Demo data / Worst case switch every skin's Foundations → Worst case page carries (the break-ui skill's toggle).
 * Dev-only chrome, the same in every skin and drawn in none of them: plain, out of the way, and switching is instant.
 */
export type Data = "demo" | "worst";

export function DataToggle({ value, onChange }: { value: Data; onChange: (v: Data) => void }) {
  const seg = (v: Data, label: string) => (
    <button type="button" aria-pressed={value === v} onClick={() => onChange(v)}
      style={{ border: 0, borderRadius: 99, padding: "6px 14px", font: "500 13px system-ui, sans-serif", cursor: "pointer",
        background: value === v ? "#fff" : "transparent", color: "#222", boxShadow: value === v ? "0 1px 2px rgba(0,0,0,.2)" : "none" }}>{label}</button>
  );
  return (
    <div role="group" aria-label="Data" style={{ position: "fixed", left: "50%", bottom: 16, translate: "-50% 0", zIndex: 10, display: "flex", gap: 2, padding: 3, borderRadius: 99, background: "#d9d9d9" }}>
      {seg("demo", "Demo data")}{seg("worst", "Worst case")}
    </div>
  );
}
