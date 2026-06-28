import { Renderable, type RenderableOptions } from "../core/renderable.ts";
import { Canvas, COLOR_DEFAULT } from "../core/canvas.ts";
import { charWidth } from "../core/width.ts";

/**
 * Scrollback — ring buffer for a high-volume log of plain text lines.
 *
 * Children are rendered once into a per-line `Uint32Array` snapshot
 * (each line's cell triple buffer) and pushed into a ring buffer. This
 * is the O(visible) escape hatch from `Scrollbox` for chat-style logs
 * that have thousands of lines but only ~30 should ever appear.
 *
 * Differs from v0.1's Scrollback:
 *   - Capacity defaults to 1000 lines (was 1000 in v0.1 too)
 *   - Children are mounted/unmounted normally, then "promoted" to
 *     snapshots as they leave the visible region
 *   - Snapshot is a flat `Uint32Array` (no per-line Canvas object)
 *
 * v0.3 note: v0.1 had a slightly different ring-buffer with
 * EditBuffer-style semantics. We keep the simpler line snapshot
 * here for v0.3 since retty's primary use-case (coding agent chat
 * log) only needs to display terminal-width strings.
 */
export interface ScrollbackOptions extends RenderableOptions {
  capacity?: number;
}

export class Scrollback extends Renderable {
  private _capacity: number;
  /** Ring buffer of line snapshots (each line is a Uint32Array cell triple). */
  private _ring: Uint32Array[] = [];
  /** Logical write head. _ring[(_head - 1) mod _capacity] is the newest line. */
  private _head = 0;
  private _size = 0;

  constructor(opts: ScrollbackOptions = {}) {
    super(opts);
    this._capacity = opts.capacity ?? 1000;
  }

  get capacity(): number {
    return this._capacity;
  }

  get lineCount(): number {
    return this._size;
  }

  /** Take a fresh line snapshot from a string and push it into the ring. */
  pushLine(text: string, fg: number = COLOR_DEFAULT, bg: number = COLOR_DEFAULT, style: number = 0, maxWidth: number = Infinity): void {
    const line = snapshotLine(text, fg, bg, style, maxWidth);
    this._ring[this._head] = line;
    this._head = (this._head + 1) % this._capacity;
    if (this._size < this._capacity) this._size++;
    this.requestRender();
  }

  private _getLine(i: number): Uint32Array | undefined {
    // i = 0 is the oldest, i = _size - 1 is the newest.
    const start = (this._head - this._size + this._capacity) % this._capacity;
    return this._ring[(start + i) % this._capacity];
  }

  override render(canvas: Canvas, x: number, y: number, w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    // Render the most recent `h` lines, bottom-aligned, oldest at top.
    const start = Math.max(0, this._size - h);
    for (let row = 0; row < h && start + row < this._size; row++) {
      const line = this._getLine(start + row);
      if (!line) continue;
      for (let col = 0; col < w; col++) {
        const off = col * 3;
        const cp = line[off]!;
        if ((cp & 0x1fffff) === 0) continue; // cell skipped (continuation or empty)
        const fg = line[off + 1]!;
        const bg = line[off + 2]!;
        canvas.setCell(x + col, y + row, String.fromCodePoint(cp & 0x1fffff), cp & 0x0fe00000, fg, bg);
      }
    }
  }
}

/** Snapshot a single string line into a fixed-width cell-triple buffer. */
function snapshotLine(text: string, fg: number, bg: number, style: number, maxWidth: number): Uint32Array {
  const w = Math.min(stringDisplayWidth(text), Math.max(1, Math.floor(maxWidth)));
  const buf = new Uint32Array(w * 3);
  let cx = 0;
  for (const ch of text) {
    const cw = charWidth(ch);
    if (cx + cw > w) break;
    const cp = ch.codePointAt(0) ?? 32;
    buf[cx * 3] = (cp & 0x1fffff) | (style & 0x0fe00000);
    buf[cx * 3 + 1] = fg;
    buf[cx * 3 + 2] = bg;
    cx += cw;
  }
  return buf;
}

function stringDisplayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += charWidth(ch);
  return w;
}
