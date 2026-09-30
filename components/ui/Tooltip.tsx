"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Hover labels for the configurator's icons. Colours, variants, materials and
// fonts are small tiles now, and their full names appear on hover.
//
// The bubble is drawn in a portal on <body> at fixed coordinates rather than
// next to the tile: the settings column scrolls inside itself, and a label
// positioned inside it would be clipped at its edges exactly where the first
// and last rows sit. Only a real mouse shows it — on a touch screen a tap is a
// choice, and the selected option's name is written out beside every step.

type Tip = { label: string; sub?: string; x: number; y: number; below: boolean };

export type TipHandlers = {
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onFocus: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
};

const noop: TipHandlers = {
  onPointerEnter: () => {},
  onPointerLeave: () => {},
  onFocus: () => {},
  onBlur: () => {},
};

const TipContext = createContext<(label: string, sub?: string) => TipHandlers>(() => noop);

/** Room the bubble needs above a tile before it flips below it instead. */
const FLIP_BELOW_PX = 76;
/** Keeps a bubble for a tile at the screen edge from running off it. */
const EDGE_PX = 132;

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const [tip, setTip] = useState<Tip | null>(null);

  const show = useCallback((el: HTMLElement, label: string, sub?: string) => {
    const r = el.getBoundingClientRect();
    const below = r.top < FLIP_BELOW_PX;
    const x = Math.min(window.innerWidth - EDGE_PX, Math.max(EDGE_PX, r.left + r.width / 2));
    setTip({ label, sub, x, y: below ? r.bottom + 8 : r.top - 8, below });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  // Anything that moves the tiles moves them out from under the bubble.
  useEffect(() => {
    if (!tip) return;
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [tip, hide]);

  const handlers = useCallback(
    (label: string, sub?: string): TipHandlers => ({
      onPointerEnter: (e) => {
        if (e.pointerType === "mouse") show(e.currentTarget, label, sub);
      },
      onPointerLeave: hide,
      // Keyboard focus gets the label too; a tap's focus does not.
      onFocus: (e) => {
        if (e.currentTarget.matches(":focus-visible")) show(e.currentTarget, label, sub);
      },
      onBlur: hide,
    }),
    [show, hide],
  );

  return (
    <TipContext.Provider value={handlers}>
      {children}
      {tip &&
        createPortal(
          <div
            role="tooltip"
            className="ui-tip"
            style={{
              left: tip.x,
              top: tip.y,
              transform: tip.below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
            }}
          >
            <span className="block">{tip.label}</span>
            {tip.sub && <span className="ui-tip-sub">{tip.sub}</span>}
          </div>,
          document.body,
        )}
    </TipContext.Provider>
  );
}

/** Spread the result onto the element the label belongs to. */
export function useTip() {
  return useContext(TipContext);
}
