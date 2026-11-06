import { useHaGuestWifi } from "@dashhaus/core";

/** The network, its code and its join QR code: what a guest needs, and nothing to press. */
export function JoinCard({ entityId }: { entityId: string }) {
  const { entity } = useHaGuestWifi(entityId);
  if (entity.state === "unavailable") return <p>Guest Wi-Fi is unavailable.</p>;
  if (entity.state === "none") return <p>No guest code to give yet.</p>;
  return (
    <figure>
      {entity.qr && <img src={entity.qr} alt={`QR code to join ${entity.network ?? "the guest network"}`} width={160} height={160} />}
      <figcaption>
        Join <strong>{entity.network}</strong>, then enter <strong>{entity.code}</strong> on the page that opens.
      </figcaption>
    </figure>
  );
}
