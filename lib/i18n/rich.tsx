import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with pieces of markup in it — a bold e-mail address,
 * a link — put where the TRANSLATION places them, since every language orders
 * its words differently:
 *
 *   rich(t("Na {email} sme poslali kód."), { email: <strong>{email}</strong> })
 *
 * The text goes through t() first with the {placeholders} still in it (t
 * leaves the ones it is not given alone), then each is swapped for its node.
 */
export function rich(text: string, parts: Record<string, ReactNode>): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    const key = m[1];
    if (!(key in parts)) continue;
    out.push(text.slice(last, m.index));
    out.push(<Fragment key={`${key}-${m.index}`}>{parts[key]}</Fragment>);
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}
