"use client";

import { useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { WALL_SURFACES, type WallGrain } from "@/lib/walls";
import { drawWallThumbnail } from "@/components/three/wallTexture";
import type { DragTarget } from "@/components/three/LetterScene";

// The surface the sign is previewed against, sitting on the right of the recap
// chips under the preview: four painted walls plus the customer's own photo.
// Each is a square swatch showing the very surface it switches to — the same
// painted tile the 3D wall uses, so the choice is made by looking rather than
// by reading four words. Picking a wall clears the photo and the other way
// round: it is one choice, not two that could contradict each other.

/** Swatch size in CSS pixels; the canvas is drawn at 2× for sharpness. */
const SWATCH_PX = 40;

export default function WallPicker({
  wall,
  onWall,
  photoName,
  photoUrl,
  onPhoto,
  onClearPhoto,
  dragTarget = "sign",
  onDragTarget,
  moved = false,
  onRecenter,
  error,
}: {
  wall: WallGrain;
  onWall: (id: WallGrain) => void;
  photoName: string | null;
  /** Object URL of that photo, so its swatch can show it. */
  photoUrl?: string | null;
  onPhoto: (file: File) => void;
  onClearPhoto: () => void;
  /** What a plain drag in the preview moves. */
  dragTarget?: DragTarget;
  onDragTarget?: (target: DragTarget) => void;
  /** True once the sign or the photo has been dragged off the middle. */
  moved?: boolean;
  onRecenter?: () => void;
  error: string | null;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      {/* No caption: each swatch shows the surface it switches to and names it
          on hover, which is what buys the room to keep this on one line with
          the parameters. */}
      <div className="flex items-center gap-1.5">
        {WALL_SURFACES.map((s) => (
          <Swatch
            key={s.id}
            label={s.label}
            title={s.hint}
            active={!photoName && wall === s.id}
            onClick={() => onWall(s.id)}
          >
            <WallThumb grain={s.id} />
          </Swatch>
        ))}

        {/* The customer's own wall. Empty it is just a plus — there is nothing
            to show yet — and once a photo is in, the swatch becomes that photo,
            with its file name on hover like every other swatch has its name. */}
        <Swatch
          label={photoName ?? "Vlastné pozadie"}
          title={photoName ? "Vlastné pozadie" : "Nahrajte fotku svojej steny a nápis sa zobrazí na nej"}
          active={!!photoName}
          dashed={!photoName}
          onClick={() => (photoName ? onClearPhoto() : fileRef.current?.click())}
        >
          {photoName && photoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              <span
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                aria-hidden="true"
              >
                <X size={9} strokeWidth={3} />
              </span>
            </>
          ) : (
            <span
              className="flex h-full w-full items-center justify-center"
              style={{ color: "var(--color-muted)" }}
            >
              <Plus size={18} strokeWidth={2.25} />
            </span>
          )}
        </Swatch>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPhoto(file);
            // Clear it so picking the same file twice still fires a change.
            e.target.value = "";
          }}
        />
      </div>

      {/* With a photo behind it, two things can be moved: the sign, to where it
          will really hang, and the photo, to bring the right part of the wall
          into the shot. These chips say which one a drag takes — turning the
          view stays on the right button, where it is everywhere else. */}
      {photoName && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold" style={{ color: "var(--color-muted)" }}>
            Ťahaním posúvam
          </span>

          {([
            { id: "sign"       as DragTarget, label: "Nápis" },
            { id: "background" as DragTarget, label: "Pozadie" },
          ]).map((t) => {
            const active = dragTarget === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => onDragTarget?.(t.id)}
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition hover:-translate-y-px"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--color-surface)",
                  color: active ? "var(--color-accent-text)" : "var(--color-muted)",
                  border: `1px solid ${active ? "var(--accent)" : "var(--color-border)"}`,
                }}
              >
                {t.label}
              </button>
            );
          })}

          {moved && onRecenter && (
            <button
              type="button"
              onClick={onRecenter}
              className="rounded-full px-2 py-0.5 text-[10px] font-bold transition hover:-translate-y-px"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
              }}
            >
              Na stred
            </button>
          )}
        </div>
      )}

      {photoName && (
        <span className="text-[10px]" style={{ color: "var(--color-muted-light)" }}>
          Ľavé tlačidlo posúva, pravé otáča pohľad (na dotyk: jeden prst posúva, dva otáčajú).
        </span>
      )}

      {error && (
        <p className="text-[10px]" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// One square swatch: the surface itself, its name on hover. The name is a
// tooltip rather than a caption so five of them still fit on one line beside
// the parameters.
function Swatch({
  label,
  title,
  active,
  dashed = false,
  onClick,
  children,
}: {
  label: string;
  title: string;
  active: boolean;
  dashed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={label}
        aria-pressed={active}
        className="relative overflow-hidden rounded-xl transition duration-200 hover:-translate-y-px"
        style={{
          height: SWATCH_PX,
          width: SWATCH_PX,
          background: "var(--color-surface)",
          border: dashed ? "1px dashed var(--color-border-strong)" : "1px solid var(--color-border)",
          boxShadow: active
            ? "0 0 0 2px var(--color-background), 0 0 0 4px var(--accent)"
            : undefined,
        }}
      >
        {children}
      </button>

      <span
        className="pointer-events-none absolute -top-6 left-1/2 z-20 max-w-40 -translate-x-1/2 truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ background: "var(--color-foreground)", color: "var(--color-background)" }}
      >
        {label}
      </span>
    </span>
  );
}

// The painted surface, drawn straight from the tile the 3D wall uses.
function WallThumb({ grain }: { grain: WallGrain }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (ref.current) drawWallThumbnail(ref.current, grain);
  }, [grain]);

  return (
    <canvas
      ref={ref}
      width={SWATCH_PX * 2}
      height={SWATCH_PX * 2}
      className="h-full w-full"
      aria-hidden="true"
    />
  );
}
