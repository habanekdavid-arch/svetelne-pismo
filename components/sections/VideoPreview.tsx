export default function VideoPreview() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-360 px-20">

        {/* 16:9 placeholder */}
        <div
          className="reveal delay-2 relative w-full overflow-hidden rounded-2xl"
          style={{
            aspectRatio: "16 / 9",
            background: "var(--color-surface)",
            boxShadow: "30px 30px 50px 0px rgba(0,0,0,0.05)",
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
            <p
              className="main-heading max-w-md text-[24px]"
              style={{ color: "var(--color-muted)" }}
            >
              Tento priestor je určený pre video
              <br />
              ktoré sa mení na základe vybraného textu
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
