"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Reveals `.reveal` / `.reveal-scale` elements as they scroll into view.
//
// Two failure modes this guards against — both left text permanently invisible,
// because the CSS starts those elements at opacity: 0.
//
// 1. Elements that appear AFTER mount were never observed. This component lives
//    in app/layout.tsx, so its effect does not re-run on a client-side
//    navigation, while the page content underneath is swapped for fresh nodes.
//    Those nodes kept opacity: 0 forever, so headings simply vanished after
//    navigating away and back. Fixed by re-scanning on pathname change and by
//    watching the DOM for nodes added later (lazy sections, the configurator's
//    dynamically imported scene, anything rendered conditionally).
//
// 2. No JavaScript at all — a failed chunk, a slow network, a crawler. The
//    hiding rule in globals.css is now gated behind [data-reveal="on"] on
//    <html>, set only here, so without JS everything renders plainly visible
//    instead of blank.

const SELECTOR = ".reveal, .reveal-scale";

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    // No IntersectionObserver (very old browser) → show everything, do nothing.
    if (typeof IntersectionObserver === "undefined") {
      root.removeAttribute("data-reveal");
      return;
    }

    root.setAttribute("data-reveal", "on");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            // Once revealed it stays revealed — no need to keep watching, and
            // it can never be hidden again by a later re-render.
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );

    function observeAll() {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (!el.classList.contains("visible")) observer.observe(el);
      });
    }

    observeAll();

    // Catch elements mounted later.
    const mutations = new MutationObserver(observeAll);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);

  return null;
}
