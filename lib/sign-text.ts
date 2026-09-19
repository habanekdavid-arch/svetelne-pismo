// What the lines of a sign are.
//
// One definition, shared by everything that has an opinion about it: the 3D
// geometry that extrudes them, the measurement that prices them, the input
// that types them and every list that shows them. A second copy of this rule
// anywhere would eventually let the preview build a sign the price does not
// cover.

/** A sign is one or two rows; Enter starts the second. */
export const MAX_LINES = 2;

/** The rows this text is made of — empty ones dropped, anything past two ignored. */
export function signLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, MAX_LINES);
}

/** The same text on one line, for a cart row or an order list. */
export function oneLine(text: string): string {
  return signLines(text).join(" / ");
}
