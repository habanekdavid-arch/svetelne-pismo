export default function VideoPreview() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">

        {/* Heading */}
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="main-heading text-3xl md:text-5xl xl:text-6xl">
            Tu sa môžete pozrieť
            <br />
            ako vyzerá váš text v praxi
          </h2>

          <p
            className="mx-auto mt-5 max-w-sm text-sm leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            Video store sa automaticky mení na základe vami
            <br className="hidden sm:block" />
            vybraného textu a nastavení konfigurácie.
          </p>
        </div>

        {/* 16:9 placeholder */}
        <div
          className="relative w-full overflow-hidden rounded-2xl"
          style={{
            aspectRatio: "16 / 9",
            background: "var(--color-surface)",
          }}
        >
          {/* Subtle inner border */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: "inset 0 0 0 1px var(--color-border)" }}
            aria-hidden="true"
          />

          {/* Centered placeholder content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            {/* Play icon */}
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "var(--color-surface-raised)" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <polygon
                  points="8,5 20,12 8,19"
                  fill="currentColor"
                  style={{ color: "var(--color-muted)" }}
                />
              </svg>
            </div>

            <p
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: "var(--color-muted)" }}
            >
              Tento priestor je určený pre video store
            </p>
            <p
              className="max-w-xs text-[11px] leading-5"
              style={{ color: "var(--color-muted)", opacity: 0.6 }}
            >
              Video sa mení na základe vybraného textu
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
