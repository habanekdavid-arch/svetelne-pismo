import type { Metadata } from "next";
import StatusPage from "@/components/layout/StatusPage";

export const metadata: Metadata = {
  title: "Stránka sa nenašla | rozsvieťTO",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <StatusPage
      tone="info"
      badge="404"
      eyebrow="Chyba 404"
      title="Táto stránka neexistuje"
      actions={[
        { href: "/#konfigurator", label: "Navrhnúť nápis", primary: true },
        { href: "/", label: "Na úvod" },
      ]}
    >
      <p>Odkaz je možno neúplný alebo stránka bola presunutá. Skúste začať od úvodu alebo rovno v konfigurátore.</p>
    </StatusPage>
  );
}
