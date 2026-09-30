"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useTip } from "@/components/ui/Tooltip";
import {
  WALL_COLORS,
  WALL_SURFACES,
  wallTextureUrl,
  type Wall,
  type WallSurfaceId,
} from "@/lib/walls";
import type { DragTarget } from "@/components/three/LetterScene";

// The wall under the preview, chosen in three tabs:
//   · Farba          — plaster painted in one of a few façade colours;
//   · Povrch         — omietka, tehla, drevo or kov, each a real texture;
//   · Vlastný návrh  — the customer's own photo, as before.
// Picking a wall clears the photo and the other way round: it is one choice,
// not two that could contradict each other.

type Tab = "color" | "surface" | "photo";

const TABS: { id: Tab; label: string }[] = [
  { id: "color",   label: "Farba" },
  { id: "surface", label: "Povrch" },
  { id: "photo",   label: "Vlastný návrh" },
];

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
  wall: Wall;
  onWall: (next: Wall) => void;
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
  const [tab, setTab] = useState<Tab>(photoName ? "photo" : "color");
  const tip = useTip();

  return (
    <div className="rounded-2xl p-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.07em]" style={{ color: "var(--color-muted)" }}>
          Pozadie
        </span>
        <div role="tablist" aria-label="Pozadie" className="flex rounded-full p-1" style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-bold tracking-[0.01em] transition"
                style={
                  active
                    ? { background: "var(--color-foreground)", color: "var(--color-background)" }
                    : { color: "var(--color-foreground-soft)" }
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tab === "color" &&
          WALL_COLORS.map((c) => {
            const active = !photoName && wall.surface === "plaster" && wall.color === c.value;
            return (
              <Tile
                key={c.id}
                active={active}
                label={`Omietka — ${c.label}`}
                onClick={() => onWall({ surface: "plaster", color: c.value })}
                tipProps={tip(c.label, "omietka v tejto farbe")}
              >
                <span
                  className="block h-full w-full"
                  style={{
                    backgroundColor: c.value,
                    backgroundImage: `url(${wallTextureUrl("plaster", "color")})`,
                    backgroundSize: "260%",
                    backgroundBlendMode: "multiply",
                  }}
                />
              </Tile>
            );
          })}

        {tab === "surface" &&
          WALL_SURFACES.map((s) => {
            const active = !photoName && wall.surface === s.id;
            return (
              <Tile
                key={s.id}
                active={active}
                label={s.label}
                caption={s.label}
                onClick={() => onWall({ surface: s.id as WallSurfaceId, color: wall.color })}
                tipProps={tip(s.label, s.hint)}
              >
                <span
                  className="block h-full w-full"
                  style={{
                    backgroundColor: s.paintable ? wall.color : undefined,
                    backgroundImage: `url(${wallTextureUrl(s.id, "color")})`,
                    backgroundSize: s.id === "brick" ? "160%" : "220%",
                    backgroundBlendMode: s.paintable ? "multiply" : undefined,
                  }}
                />
              </Tile>
            );
          })}

        {tab === "photo" && (
          <>
            {photoName && photoUrl ? (
              <Tile active label={photoName} onClick={onClearPhoto} tipProps={tip(photoName, "kliknutím odstránite")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                <span
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                  aria-hidden="true"
                >
                  <X size={11} strokeWidth={3} />
                </span>
              </Tile>
            ) : null}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition hover:-translate-y-px"
              style={{ background: "var(--color-background)", color: "var(--color-foreground)", border: "2px dashed var(--color-border-strong)" }}
            >
              <Upload size={15} strokeWidth={2.25} />
              {photoName ? "Nahrať inú fotku" : "Nahrať fotku vašej steny"}
            </button>
          </>
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
          into the shot. */}
      {tab === "photo" && photoName && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>
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
                className="rounded-full px-3 py-1 text-[12px] font-bold transition hover:-translate-y-px"
                style={{
                  background: active ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "var(--color-background)",
                  color: "var(--color-foreground)",
                  border: `1.5px solid ${active ? "var(--accent)" : "var(--color-border-strong)"}`,
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
              className="rounded-full px-3 py-1 text-[12px] font-bold transition hover:-translate-y-px"
              style={{ background: "var(--color-background)", color: "var(--color-foreground)", border: "1.5px solid var(--color-border-strong)" }}
            >
              Na stred
            </button>
          )}
          <span className="basis-full text-[11.5px]" style={{ color: "var(--color-muted)" }}>
            Ľavé tlačidlo posúva, pravé otáča pohľad (na dotyk: jeden prst posúva, dva otáčajú).
          </span>
        </div>
      )}

      {tab === "photo" && !photoName && (
        <p className="mt-2 text-[12px]" style={{ color: "var(--color-muted)" }}>
          Fotka ostane len vo vašom prehliadači — nikam sa neodosiela.
        </p>
      )}

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** One square swatch, optionally with its name under it. */
function Tile({
  active,
  label,
  caption,
  onClick,
  tipProps,
  children,
}: {
  active: boolean;
  label: string;
  caption?: string;
  onClick: () => void;
  tipProps: ReturnType<ReturnType<typeof useTip>>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex flex-col items-center gap-1 transition hover:-translate-y-px"
      {...tipProps}
    >
      <span
        className="relative block h-12 w-12 overflow-hidden rounded-xl"
        style={{
          border: "1px solid var(--color-border-strong)",
          boxShadow: active ? "0 0 0 2px var(--color-background), 0 0 0 4px var(--accent)" : undefined,
        }}
      >
        {children}
      </span>
      {caption && (
        <span className="text-[12px] font-bold" style={{ color: "var(--color-foreground)" }}>
          {caption}
        </span>
      )}
    </button>
  );
}
