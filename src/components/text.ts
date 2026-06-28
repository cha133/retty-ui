import { Renderable, type RenderableOptions } from "../core/renderable.ts";
import { Canvas, StyleFlags, parseColor } from "../core/canvas.ts";
import { layoutText } from "../core/text-layout.ts";
import { MeasureMode } from "../core/yoga.ts";
import { charWidth } from "../core/width.ts";

export interface TextOptions extends RenderableOptions {
  color?: string | number;
  backgroundColor?: string | number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  strikethrough?: boolean;
  blink?: boolean;
  inverse?: boolean;
  wrap?: boolean;
}

function styleFlags(opts: TextOptions): number {
  let f = 0;
  if (opts.bold) f |= StyleFlags.Bold;
  if (opts.italic) f |= StyleFlags.Italic;
  if (opts.underline) f |= StyleFlags.Underline;
  if (opts.dim) f |= StyleFlags.Dim;
  if (opts.strikethrough) f |= StyleFlags.Strikethrough;
  if (opts.blink) f |= StyleFlags.Blink;
  if (opts.inverse) f |= StyleFlags.Inverse;
  return f;
}

export class Text extends Renderable {
  private _text: string;
  private _color: number;
  private _bgColor: number;
  private _flags: number;
  private _wrap: boolean;

  constructor(text: string = "", opts: TextOptions = {}) {
    const { color, backgroundColor, bold, italic, underline, dim, strikethrough, blink, inverse, wrap, ...rest } = opts;
    super(rest);
    this._text = text;
    this._color = parseColor(color);
    this._bgColor = parseColor(backgroundColor);
    this._flags = styleFlags(opts);
    this._wrap = wrap ?? true;

    this.yogaNode.setMeasureFunc((width, widthMode) => {
      const maxW = widthMode === MeasureMode.Undefined ? Infinity : width;
      const { width: measuredW, height } = layoutText(this._text, maxW, this._wrap);
      return { width: measuredW, height };
    });
  }

  get text(): string {
    return this._text;
  }

  set text(value: string) {
    if (this._text === value) return;
    this._text = value;
    this.yogaNode.markDirty();
    this.requestRender();
  }

  get color(): number {
    return this._color;
  }

  set color(value: string | number) {
    this._color = parseColor(value);
    this.requestRender();
  }

  setWrap(wrap: boolean): void {
    this._wrap = wrap;
    this.yogaNode.markDirty();
    this.requestRender();
  }

  override render(canvas: Canvas, x: number, y: number, w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    const { lines } = layoutText(this._text, w, this._wrap);
    for (let row = 0; row < lines.length && row < h; row++) {
      const line = lines[row]!;
      let cx = x;
      for (const ch of line) {
        const cw = charWidth(ch);
        if (cx + cw > x + w) break;
        canvas.setCell(cx, y + row, ch, this._flags, this._color, this._bgColor);
        cx += cw;
      }
    }
  }
}
