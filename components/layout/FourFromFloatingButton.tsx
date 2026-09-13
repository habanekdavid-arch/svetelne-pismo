import Image from "next/image";

// Floating 4from media badge, bottom-left — the same component vytlacto3d
// runs, with its own logo asset (public/4from-media.png, copied from there).
//
// It replaces the floating price pill that used to sit in this corner. That
// pill duplicated the price already shown in the configurator's price card,
// and on the configurator page the two overlapped each other.
//
// z-40, not the source's z-50: the cart drawer and its backdrop are z-50 and
// must cover this, not sit under it.

export default function FourFromFloatingButton() {
  return (
    <a
      href="https://www.4frommedia.sk"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="4from media"
      className="fixed bottom-5 left-5 z-40 hidden rounded-2xl p-3 shadow-lg backdrop-blur transition hover:-translate-y-1 hover:shadow-xl md:block"
      style={{
        background: "color-mix(in srgb, var(--color-background) 90%, transparent)",
        border: "1px solid var(--color-border)",
      }}
    >
      <Image
        src="/4from-media.png"
        alt="4from media"
        width={130}
        height={52}
        className="h-auto w-[130px]"
      />
    </a>
  );
}
