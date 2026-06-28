import { getCodePointWidth } from "./width.ts";

export interface LayoutTextResult {
  lines: string[];
  width: number;
  height: number;
}

export function layoutText(text: string, maxWidth: number, shouldWrap: boolean): LayoutTextResult {
  if (!text) {
    return { lines: [""], width: 0, height: 1 };
  }

  const rawLines = text.split("\n");

  if (!shouldWrap || maxWidth <= 0) {
    let maxW = 0;
    for (const l of rawLines) {
      let w = 0;
      for (const ch of l) w += getCodePointWidth(ch.codePointAt(0) ?? 32);
      if (w > maxW) maxW = w;
    }
    return { lines: rawLines.length ? rawLines : [""], width: maxW, height: rawLines.length || 1 };
  }

  const outLines: string[] = [];

  for (const rawLine of rawLines) {
    if (rawLine === "") {
      outLines.push("");
      continue;
    }

    let current = "";
    let currentW = 0;

    for (const ch of rawLine) {
      const cp = ch.codePointAt(0) ?? 32;
      const cw = getCodePointWidth(cp);

      if (currentW + cw > maxWidth) {
        outLines.push(current);
        current = ch;
        currentW = cw;
      } else {
        current += ch;
        currentW += cw;
      }
    }

    if (current !== "" || outLines.length === 0) {
      outLines.push(current);
    }
  }

  let maxW = 0;
  for (const l of outLines) {
    let w = 0;
    for (const ch of l) w += getCodePointWidth(ch.codePointAt(0) ?? 32);
    if (w > maxW) maxW = w;
  }

  return { lines: outLines, width: maxW, height: outLines.length };
}

export function measureText(
  text: string,
  maxWidth: number,
  shouldWrap: boolean,
): { width: number; height: number } {
  const { width, height } = layoutText(text, maxWidth, shouldWrap);
  return { width, height };
}
