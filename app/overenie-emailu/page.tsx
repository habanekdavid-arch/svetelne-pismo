import type { Metadata } from "next";
import StatusPage from "@/components/layout/StatusPage";

export const metadata: Metadata = {
  title: "Overenie e-mailu | rozsvieťTO",
  robots: { index: false, follow: false },
};

// Where the link in the verification e-mail lands (app/api/auth/verify).
export default async function VerifyResultPage({ searchParams }: { searchParams: Promise<{ stav?: string }> }) {
  const { stav } = await searchParams;
  if (stav === "ok") {
    return (
      <StatusPage
        tone="ok"
        badge="✓"
        eyebrow="Overenie e-mailu"
        title="E-mail je overený"
        actions={[
          { href: "/#konfigurator", label: "Pokračovať v konfigurátore", primary: true },
          { href: "/ucet", label: "Môj účet" },
        ]}
      >
        <p>Ďakujeme. Teraz uvidíte ceny nápisov a môžete objednávať.</p>
      </StatusPage>
    );
  }
  return (
    <StatusPage
      tone="warn"
      badge="!"
      eyebrow="Overenie e-mailu"
      title="Odkaz nie je platný"
      actions={[
        { href: "/prihlasenie?spat=%2Fucet", label: "Prihlásiť sa", primary: true },
        { href: "/", label: "Na úvod" },
      ]}
    >
      <p>
        Overovací odkaz je neplatný alebo mu vypršala platnosť. Prihláste sa — pod hlavičkou stránky
        zadáte 6-miestny kód z e-mailu, alebo si pošlete nový.
      </p>
    </StatusPage>
  );
}
