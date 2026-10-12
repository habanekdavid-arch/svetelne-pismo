import type { Metadata } from "next";
import StatusPage from "@/components/layout/StatusPage";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Overenie e-mailu | rozsvieťTO",
  robots: { index: false, follow: false },
};

// Where the link in the verification e-mail lands (app/api/auth/verify).
export default async function VerifyResultPage({ searchParams }: { searchParams: Promise<{ stav?: string }> }) {
  const { t } = await getT();
  const { stav } = await searchParams;
  if (stav === "ok") {
    return (
      <StatusPage
        tone="ok"
        badge="✓"
        eyebrow={t("Overenie e-mailu")}
        title={t("E-mail je overený")}
        actions={[
          { href: "/#konfigurator", label: t("Pokračovať v konfigurátore"), primary: true },
          { href: "/ucet", label: t("Môj účet") },
        ]}
      >
        <p>{t("Ďakujeme. Teraz uvidíte ceny nápisov a môžete objednávať.")}</p>
      </StatusPage>
    );
  }
  return (
    <StatusPage
      tone="warn"
      badge="!"
      eyebrow={t("Overenie e-mailu")}
      title={t("Odkaz nie je platný")}
      actions={[
        { href: "/prihlasenie?spat=%2Fucet", label: t("Prihlásiť sa"), primary: true },
        { href: "/", label: t("Na úvod") },
      ]}
    >
      <p>
        {t("Overovací odkaz je neplatný alebo mu vypršala platnosť. Prihláste sa — pod hlavičkou stránky zadáte 6-miestny kód z e-mailu, alebo si pošlete nový.")}
      </p>
    </StatusPage>
  );
}
