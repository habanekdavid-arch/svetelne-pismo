import type { Metadata } from "next";
import StatusPage from "@/components/layout/StatusPage";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Stránka sa nenašla | rozsvieťTO",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const { t } = await getT();
  return (
    <StatusPage
      tone="info"
      badge="404"
      eyebrow={t("Chyba 404")}
      title={t("Táto stránka neexistuje")}
      actions={[
        { href: "/#konfigurator", label: t("Navrhnúť nápis"), primary: true },
        { href: "/", label: t("Na úvod") },
      ]}
    >
      <p>{t("Odkaz je možno neúplný alebo stránka bola presunutá. Skúste začať od úvodu alebo rovno v konfigurátore.")}</p>
    </StatusPage>
  );
}
