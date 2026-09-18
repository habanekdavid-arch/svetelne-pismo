"use client";

import { useRef } from "react";
import { ImagePlus, Move, X } from "lucide-react";
import { WALL_SURFACES, type WallGrain } from "@/lib/walls";
import type { DragTarget } from "@/components/three/LetterScene";

// The surface the sign is previewed against, sitting on the right of the
// recap chips under the preview: four painted walls plus the customer's own
// photo. Picking a wall clears the photo and the other way round — it is one
// choice, not two that could contradict each other.

export default function WallPicker({
  wall,
  onWall,
  photoName,
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
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[10px] font-bold" style={{ color: "var(--color-muted)" }}>
          Stena
        </span>

        {WALL_SURFACES.map((s) => {
          const active = !photoName && wall === s.id;
          return (
            <button
              key={s.id}
              type="button"
              title={s.hint}
              aria-pressed={active}
              onClick={() => onWall(s.id)}
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition hover:-translate-y-px"
              style={{
                background: active ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "var(--color-surface)",
                color: active ? "var(--color-accent-text)" : "var(--color-muted)",
                border: `1px solid ${active ? "var(--accent)" : "var(--color-border)"}`,
              }}
            >
              {s.label}
            </button>
          );
        })}

        {photoName ? (
          <span
            className="inline-flex max-w-45 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{
              background: "color-mix(in srgb, var(--accent) 15%, transparent)",
              color: "var(--color-accent-text)",
              border: "1px solid var(--accent)",
            }}
          >
            <span className="truncate">{photoName}</span>
            <button
              type="button"
              onClick={onClearPhoto}
              aria-label="Odstrániť vlastné pozadie"
              className="shrink-0 transition hover:opacity-70"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition hover:-translate-y-px"
            style={{
              background: "var(--color-surface)",
              color: "var(--color-muted)",
              border: "1px dashed var(--color-border-strong)",
            }}
            title="Nahrajte fotku svojej steny a nápis sa zobrazí na nej"
          >
            <ImagePlus size={11} strokeWidth={2.25} />
            Vlastné pozadie
          </button>
        )}

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
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: "var(--color-muted)" }}
          >
            <Move size={11} strokeWidth={2.25} />
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
                title={
                  t.id === "sign"
                    ? "Ťahanie posúva nápis"
                    : "Ťahanie posúva fotku za nápisom"
                }
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
