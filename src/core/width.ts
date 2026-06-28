export function getCodePointWidth(codePoint: number): number {
  if (codePoint < 0x1100) return 1;
  if (codePoint <= 0x115f) return 2;
  if (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) return 2;
  if (codePoint >= 0xac00 && codePoint <= 0xd7a3) return 2;
  if (codePoint >= 0xf900 && codePoint <= 0xfaff) return 2;
  if (codePoint >= 0xfe10 && codePoint <= 0xfe19) return 2;
  if (codePoint >= 0xfe30 && codePoint <= 0xfe6f) return 2;
  if (codePoint >= 0xff00 && codePoint <= 0xff60) return 2;
  if (codePoint >= 0xffe0 && codePoint <= 0xffe6) return 2;
  if (codePoint >= 0x1f300 && codePoint <= 0x1f9ff) return 2;
  if (codePoint >= 0x20000 && codePoint <= 0x3ffff) return 2;
  return 1;
}

export function charWidth(char: string): number {
  const cp = char.codePointAt(0) ?? 32;
  return getCodePointWidth(cp);
}

export function stringWidth(str: string): number {
  let w = 0;
  for (const char of str) {
    w += charWidth(char);
  }
  return w;
}
