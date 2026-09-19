import { redirect } from "next/navigation";

// The order history moved into the customer area (/ucet/objednavky) when the
// account grew a sidebar. This route stays so older links — and any e-mail
// already sent — still land in the right place.
export default function MyOrdersRedirect() {
  redirect("/ucet/objednavky");
}
