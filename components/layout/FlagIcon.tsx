import { useId } from "react";
import type { Locale } from "@/lib/i18n/config";

/**
 * A language's flag, drawn as SVG — the same flags vytlacto3d's switcher
 * shows. Emoji flags (🇸🇰) are not used: Windows renders them as the bare
 * letters "SK".
 */
export default function FlagIcon({ locale, className = "h-3.5 w-5" }: { locale: Locale; className?: string }) {
  const id = useId().replace(/:/g, "");
  const common = {
    className: `${className} shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.12)]`,
    "aria-hidden": true,
    preserveAspectRatio: "xMidYMid slice",
  } as const;

  if (locale === "sk") {
    return (
      <svg viewBox="0 0 900 600" {...common}>
        <rect width="900" height="600" fill="#EE1C25" />
        <rect width="900" height="400" fill="#0B4EA2" />
        <rect width="900" height="200" fill="#fff" />
        {/* the coat of arms, simplified: red shield, white double cross, blue hills */}
        <path d="M150 145H400V330C400 425 335 465 275 495C215 465 150 425 150 330Z" fill="#fff" />
        <path d="M164 159H386V330C386 415 328 450 275 478C222 450 164 415 164 330Z" fill="#EE1C25" />
        <path d="M265 190h20v62h55v20h-55v40h70v20h-70v68h-20v-68h-70v-20h70v-40h-55v-20h55z" fill="#fff" />
        <path d="M168 395Q212 352 245 388Q275 340 305 388Q338 352 382 395C366 430 330 455 275 478C220 455 184 430 168 395Z" fill="#0B4EA2" />
      </svg>
    );
  }

  if (locale === "hu") {
    return (
      <svg viewBox="0 0 6 3" {...common}>
        <rect width="6" height="3" fill="#477050" />
        <rect width="6" height="2" fill="#fff" />
        <rect width="6" height="1" fill="#CE2939" />
      </svg>
    );
  }

  if (locale === "de") {
    return (
      <svg viewBox="0 0 5 3" {...common}>
        <rect width="5" height="3" fill="#FFCE00" />
        <rect width="5" height="2" fill="#DD0000" />
        <rect width="5" height="1" fill="#000" />
      </svg>
    );
  }

  // en — the Union Jack
  const clip = `${id}-flag`;
  const diag = `${id}-diag`;
  return (
    <svg viewBox="0 0 60 30" {...common}>
      <clipPath id={clip}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={diag}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${diag})`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
