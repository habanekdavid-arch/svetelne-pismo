import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";
import AdminLoginForm from "@/app/admin/prihlasenie/AdminLoginForm";

// Server wrapper around the login form: anyone who already has admin rights —
// through the admin cookie, or through an account whose e-mail is listed in
// ADMIN_EMAILS — is sent straight to /admin instead of being asked to sign in
// a second time. The form itself (client component) is unchanged.
export default async function AdminLoginPage() {
  if (await getAdminIdentity()) redirect("/admin");
  return <AdminLoginForm />;
}
