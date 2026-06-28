import { getCodePointWidth } from "./width.ts";

export const StyleFlags = {
  Bold: 1 << 21,
  Italic: 1 << 22,
  Underline: 1 << 23,
  Dim: 1 << 24,
  Strikethrough: 1 << 25,
  Blink: 1 << 26,
  Inverse: 1 << 27,
  Wide: 1 << 28,
  Continuation: 1 << 29,
} as const;

export type StyleFlag = number;

export const COLOR_DEFAULT = 0x01000000;

export function rgb(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff & 0xff);
}

export function parseColor(input: string | number | undefined): number {
  if (input === undefined || input === null) return COLOR_DEFAULT;
  if (typeof input === "number") return input;
  if (input === "default") return COLOR_DEFAULT;
  const hex = input.replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return parseInt(hex, 16);
  }
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return rgb(
      parseInt(hex[0]! + hex[0]!, 16),
      parseInt(hex[1]! + hex[1]!, 16),
      parseInt(hex[2]! + hex[2]!, 16),
    );
  }
  const named: Record<string, number> = {
    black: rgb(0, 0, 0),
    white: rgb(255, 255, 255),
    red: rgb(255, 0, 0),
    green: rgb(0, 255, 0),
    blue: rgb(0, 0, 255),
    yellow: rgb(255, 255, 0),
    cyan: rgb(0, 255, 255),
    magenta: rgb(255, 0, 255),
    gray: rgb(128, 128, 128),
    grey: rgb(128, 128, 128),
  };
  return named[input] ?? COLOR_DEFAULT;
}

export interface ClipRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Canvas {
  public width = 0;
  public height = 0;
  public buffer: Uint32Array = new Uint32Array(0);

  private _clipStack: ClipRect[] = [];

  constructor(width: number, height: number) {
    this.resize(width, height);
  }

  pushClip(x: number, y: number, w: number, h: number): void {
    if (w <= 0 || h <= 0) {
      this._clipStack.push({ x: 0, y: 0, w: 0, h: 0 });
      return;
    }
    if (this._clipStack.length === 0) {
      this._clipStack.push({ x, y, w, h });
      return;
    }
    const top = this._clipStack[this._clipStack.length - 1]!;
    const nx = Math.max(x, top.x);
    const ny = Math.max(y, top.y);
    const nx2 = Math.min(x + w, top.x + top.w);
    const ny2 = Math.min(y + h, top.y + top.h);
    this._clipStack.push({ x: nx, y: ny, w: Math.max(0, nx2 - nx), h: Math.max(0, ny2 - ny) });
  }

  popClip(): void {
    this._clipStack.pop();
  }

  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.buffer = new Uint32Array(width * height * 3);
    this.clear();
  }

  clear(bg: number = COLOR_DEFAULT): void {
    const total = this.width * this.height;
    for (let i = 0; i < total; i++) {
      const off = i * 3;
      this.buffer[off] = 32;
      this.buffer[off + 1] = COLOR_DEFAULT;
      this.buffer[off + 2] = bg;
    }
  }

  setCell(x: number, y: number, char: string, style: number, fg: number, bg: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const stack = this._clipStack;
    if (stack.length > 0) {
      const c = stack[stack.length - 1]!;
      if (x < c.x || x >= c.x + c.w || y < c.y || y >= c.y + c.h) return;
    }

    const off = (y * this.width + x) * 3;
    const cp = char.codePointAt(0) ?? 32;
    const w = getCodePointWidth(cp);

    const oldVal = this.buffer[off]!;
    if ((oldVal & StyleFlags.Wide) !== 0 && x + 1 < this.width) {
      const nextOff = off + 3;
      if ((this.buffer[nextOff]! & StyleFlags.Continuation) !== 0) {
        this.buffer[nextOff] = 32;
        this.buffer[nextOff + 1] = COLOR_DEFAULT;
        this.buffer[nextOff + 2] = bg;
      }
    }

    if ((oldVal & StyleFlags.Continuation) !== 0 && x > 0) {
      const prevOff = off - 3;
      this.buffer[prevOff] = 32 | (this.buffer[prevOff]! & ~0x1fffff);
      this.buffer[prevOff] &= ~StyleFlags.Wide;
    }

    if (w === 2) {
      if (x + 1 < this.width) {
        const nextOff = off + 3;
        const nextOld = this.buffer[nextOff]!;
        if ((nextOld & StyleFlags.Wide) !== 0 && x + 2 < this.width) {
          const postOff = nextOff + 3;
          if ((this.buffer[postOff]! & StyleFlags.Continuation) !== 0) {
            this.buffer[postOff] = 32;
            this.buffer[postOff + 1] = COLOR_DEFAULT;
            this.buffer[postOff + 2] = bg;
          }
        }
        this.buffer[off] = (cp & 0x1fffff) | (style & 0x0fe00000) | StyleFlags.Wide;
        this.buffer[off + 1] = fg;
        this.buffer[off + 2] = bg;
        this.buffer[nextOff] = 32 | (style & 0x0fe00000) | StyleFlags.Continuation;
        this.buffer[nextOff + 1] = fg;
        this.buffer[nextOff + 2] = bg;
      } else {
        this.buffer[off] = 32 | (style & 0x0fe00000);
        this.buffer[off + 1] = fg;
        this.buffer[off + 2] = bg;
      }
    } else {
      this.buffer[off] = (cp & 0x1fffff) | (style & 0x0fe00000);
      this.buffer[off + 1] = fg;
      this.buffer[off + 2] = bg;
    }
  }

  copyTo(dest: Canvas): void {
    if (dest.width !== this.width || dest.height !== this.height) {
      dest.resize(this.width, this.height);
    }
    dest.buffer.set(this.buffer);
  }

  toString(): string {
    const lines: string[] = [];
    for (let y = 0; y < this.height; y++) {
      let line = "";
      for (let x = 0; x < this.width; x++) {
        const v = this.buffer[(y * this.width + x) * 3]!;
        if ((v & StyleFlags.Continuation) !== 0) continue;
        line += String.fromCodePoint(v & 0x1fffff);
      }
      lines.push(line);
    }
    return lines.join("\n");
  }
}
