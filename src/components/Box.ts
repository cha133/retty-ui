import { Canvas, COLOR_DEFAULT, parseColor, StyleFlags } from "../core/canvas.ts";
import { Renderable, type RenderableOptions } from "../core/renderable.ts";
import { Edge } from "../core/yoga.ts";

export type BorderStyle = "single" | "double" | "round" | "classic" | "none";

const BORDER_CHARS: Record<
  Exclude<BorderStyle, "none">,
  { tl: string; tr: string; bl: string; br: string; h: string; v: string }
> = {
  single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
  double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
  round: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
  classic: { tl: "+", tr: "+", bl: "+", br: "+", h: "-", v: "|" },
};

export interface BoxOptions extends RenderableOptions {
  borderStyle?: BorderStyle;
  borderColor?: string | number;
  backgroundColor?: string | number;
  color?: string | number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  strikethrough?: boolean;
  blink?: boolean;
  inverse?: boolean;
}

function styleFlags(opts: BoxOptions): number {
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

export class Box extends Renderable {
  private borderStyle: BorderStyle;
  private borderColor: number;
  private bgColor: number;
  private flags: number;

  constructor(opts: BoxOptions = {}) {
    const {
      borderStyle,
      borderColor,
      backgroundColor,
      color,
      bold,
      italic,
      underline,
      dim,
      strikethrough,
      blink,
      inverse,
      ...rest
    } = opts;
    super(rest);
    this.borderStyle = borderStyle ?? "none";
    this.borderColor = parseColor(borderColor ?? color);
    this.bgColor = parseColor(backgroundColor);
    this.flags = styleFlags(opts);

    const borderSize = this.borderStyle !== "none" ? 1 : 0;
    if (borderSize > 0) {
      this.yogaNode.setBorder(Edge.Top, borderSize);
      this.yogaNode.setBorder(Edge.Bottom, borderSize);
      this.yogaNode.setBorder(Edge.Left, borderSize);
      this.yogaNode.setBorder(Edge.Right, borderSize);
    }
  }

  setBorder(style: BorderStyle, color?: string | number): void {
    this.borderStyle = style;
    if (color !== undefined) this.borderColor = parseColor(color);
    const size = style !== "none" ? 1 : 0;
    this.yogaNode.setBorder(Edge.Top, size);
    this.yogaNode.setBorder(Edge.Bottom, size);
    this.yogaNode.setBorder(Edge.Left, size);
    this.yogaNode.setBorder(Edge.Right, size);
    this.requestRender();
  }

  setBackgroundColor(color: string | number | undefined): void {
    this.bgColor = parseColor(color);
    this.requestRender();
  }

  override render(canvas: Canvas, x: number, y: number, w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    if (this.bgColor !== COLOR_DEFAULT) {
      for (let cy = y; cy < y + h; cy++) {
        for (let cx = x; cx < x + w; cx++) {
          canvas.setCell(cx, cy, " ", this.flags, COLOR_DEFAULT, this.bgColor);
        }
      }
    }
  }

  override renderAfter = (canvas: Canvas, x: number, y: number, w: number, h: number): void => {
    if (this.borderStyle === "none" || w < 2 || h < 2) return;
    const chars = BORDER_CHARS[this.borderStyle];
    const fg = this.borderColor;
    const bg = this.bgColor;
    canvas.setCell(x, y, chars.tl, this.flags, fg, bg);
    canvas.setCell(x + w - 1, y, chars.tr, this.flags, fg, bg);
    canvas.setCell(x, y + h - 1, chars.bl, this.flags, fg, bg);
    canvas.setCell(x + w - 1, y + h - 1, chars.br, this.flags, fg, bg);
    for (let cx = x + 1; cx < x + w - 1; cx++) {
      canvas.setCell(cx, y, chars.h, this.flags, fg, bg);
      canvas.setCell(cx, y + h - 1, chars.h, this.flags, fg, bg);
    }
    for (let cy = y + 1; cy < y + h - 1; cy++) {
      canvas.setCell(x, cy, chars.v, this.flags, fg, bg);
      canvas.setCell(x + w - 1, cy, chars.v, this.flags, fg, bg);
    }
  };
}
