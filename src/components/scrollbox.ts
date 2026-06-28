import { Renderable, type RenderableOptions, type LayoutStyle } from "../core/renderable.ts";
import { Box, type BoxOptions } from "./box.ts";
import type { Canvas } from "../core/canvas.ts";
import type { KeyEvent } from "../core/input.ts";

export interface ScrollboxOptions extends RenderableOptions {
  onScroll?: (offset: number) => void;
}

type PaddingOnly = "padding" | "paddingX" | "paddingY" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft";

function splitPadding(style?: LayoutStyle): { paddingStyle: LayoutStyle; rest: LayoutStyle } {
  if (!style) return { paddingStyle: {}, rest: {} };
  const paddingKeys: PaddingOnly[] = ["padding", "paddingX", "paddingY", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
  const paddingStyle: LayoutStyle = {};
  const rest: LayoutStyle = { ...style };
  for (const k of paddingKeys) {
    if (rest[k as keyof LayoutStyle] !== undefined) {
      (paddingStyle[k as keyof LayoutStyle] as unknown) = rest[k as keyof LayoutStyle];
      delete rest[k as keyof LayoutStyle];
    }
  }
  return { paddingStyle, rest };
}

export class Scrollbox extends Box {
  private viewport: Box;
  private content: Box;
  private _scrollOffset = 0;
  private _onScroll?: (offset: number) => void;

  constructor(opts: ScrollboxOptions = {}) {
    const { onScroll, style, ...rest } = opts;
    const { paddingStyle, rest: restStyle } = splitPadding(style);
    const base: LayoutStyle = { flexShrink: 1 };
    if (restStyle.flexBasis === undefined && restStyle.height === undefined) {
      base.flexBasis = 0;
    }
    super({ ...rest, focusable: true, style: { ...base, ...restStyle } } as BoxOptions);
    this._onScroll = onScroll;

    this.viewport = new Box({ style: { flexGrow: 1, flexShrink: 1 } });
    this.viewport.clipChildren = true;
    this.content = new Box({ style: { flexShrink: 0, flexDirection: "column", ...paddingStyle } });

    super.add(this.viewport);
    this.viewport.add(this.content);

    this.handleKeyPress = (key: KeyEvent): boolean => this.onKeyPress(key);
  }

  override add(child: Renderable, index?: number): void {
    this.content.add(child, index);
  }

  override remove(child: Renderable): void {
    this.content.remove(child);
  }

  get scrollOffset(): number {
    return this._scrollOffset;
  }

  maxScrollOffset(): number {
    return Math.max(0, this.content.computedHeight - this.viewport.computedHeight);
  }

  scrollTo(offset: number): void {
    const max = this.maxScrollOffset();
    const clamped = Math.max(0, Math.min(offset, max));
    if (clamped === this._scrollOffset) return;
    this._scrollOffset = clamped;
    this.content.translateY = -clamped;
    this._onScroll?.(clamped);
    this.requestRender();
  }

  scrollBy(delta: number): void {
    this.scrollTo(this._scrollOffset + delta);
  }

  scrollToBottom(): void {
    this.scrollTo(this.maxScrollOffset());
  }

  override render(canvas: Canvas, x: number, y: number, w: number, h: number): void {
    super.render(canvas, x, y, w, h);
  }

  private onKeyPress(key: KeyEvent): boolean {
    const vh = this.viewport.computedHeight;
    switch (key.name) {
      case "up":
        this.scrollBy(-1);
        return true;
      case "down":
        this.scrollBy(1);
        return true;
      case "pageup":
        this.scrollBy(-(vh - 1));
        return true;
      case "pagedown":
        this.scrollBy(vh - 1);
        return true;
      case "home":
        this.scrollTo(0);
        return true;
      case "end":
        this.scrollToBottom();
        return true;
      default:
        return false;
    }
  }
}
