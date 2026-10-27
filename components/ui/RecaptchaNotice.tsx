"use client";

import { useRecaptchaEnabled } from "@/lib/recaptcha";
import { useT } from "@/lib/i18n/client";

// Google allows hiding the floating reCAPTCHA badge (globals.css) only when
// the form says it is protected and links Google's terms — this line.
export default function RecaptchaNotice({ className = "" }: { className?: string }) {
  const t = useT();
  const enabled = useRecaptchaEnabled();
  if (!enabled) return null;
  return (
    <p className={`text-[11px] leading-4 ${className}`} style={{ color: "var(--color-muted)" }}>
      {t("Formulár je chránený službou reCAPTCHA od Google. Platia")}{" "}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
        {t("Zásady ochrany súkromia")}
      </a>{" "}
      {t("a")}{" "}
      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
        {t("Zmluvné podmienky")}
      </a>{" "}
      {t("spoločnosti Google.")}
    </p>
  );
}
