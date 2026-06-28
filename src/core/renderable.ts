import type { Canvas } from "./canvas.ts";
import type { KeyEvent } from "./input.ts";
import {
  Align,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  Node,
  Overflow,
  PositionType,
} from "./yoga.ts";

export type FlexDirectionString = "row" | "column" | "row-reverse" | "column-reverse";
export type JustifyString =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";
export type AlignString = "flex-start" | "center" | "flex-end" | "stretch";
export type OverflowString = "visible" | "hidden" | "scroll";
export type PositionTypeString = "static" | "relative" | "absolute";
export type DisplayString = "flex" | "none";
export type DimensionValue = number | "auto";
export type EdgeValue = number | "auto";

export interface LayoutStyle {
  flexDirection?: FlexDirectionString;
  justifyContent?: JustifyString;
  alignItems?: AlignString;
  alignSelf?: AlignString;
  overflow?: OverflowString;
  position?: PositionTypeString;
  display?: DisplayString;

  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | "auto";
  flex?: number;

  width?: DimensionValue;
  height?: DimensionValue;
  minWidth?: DimensionValue;
  minHeight?: DimensionValue;
  maxWidth?: DimensionValue;
  maxHeight?: DimensionValue;

  padding?: number;
  paddingX?: number;
  paddingY?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  margin?: EdgeValue;
  marginX?: EdgeValue;
  marginY?: EdgeValue;
  marginTop?: EdgeValue;
  marginRight?: EdgeValue;
  marginBottom?: EdgeValue;
  marginLeft?: EdgeValue;

  top?: EdgeValue;
  right?: EdgeValue;
  bottom?: EdgeValue;
  left?: EdgeValue;

  border?: number;
  borderTop?: number;
  borderRight?: number;
  borderBottom?: number;
  borderLeft?: number;

  gap?: number;
}

export interface RenderableOptions {
  style?: LayoutStyle;
  focusable?: boolean;
  visible?: boolean;
  id?: string;
}

const FLEX_DIR_MAP: Record<FlexDirectionString, FlexDirection> = {
  row: FlexDirection.Row,
  column: FlexDirection.Column,
  "row-reverse": FlexDirection.RowReverse,
  "column-reverse": FlexDirection.ColumnReverse,
};

const JUSTIFY_MAP: Record<JustifyString, Justify> = {
  "flex-start": Justify.FlexStart,
  center: Justify.Center,
  "flex-end": Justify.FlexEnd,
  "space-between": Justify.SpaceBetween,
  "space-around": Justify.SpaceBetween, // TUI subset ignores SpaceAround; alias to SpaceBetween to avoid silent no-op
  "space-evenly": Justify.SpaceBetween, // ditto
};

const ALIGN_MAP: Record<AlignString, Align> = {
  "flex-start": Align.FlexStart,
  center: Align.Center,
  "flex-end": Align.FlexEnd,
  stretch: Align.Stretch,
};

const OVERFLOW_MAP: Record<OverflowString, Overflow> = {
  visible: Overflow.Visible,
  hidden: Overflow.Hidden,
  scroll: Overflow.Hidden, // TUI subset: setOverflow only stores the value, runtime clip is renderer-side; alias Hidden for safety
};

const POSITION_MAP: Record<PositionTypeString, PositionType> = {
  static: PositionType.Static,
  relative: PositionType.Relative,
  absolute: PositionType.Absolute,
};

function applyDimension(
  node: Node,
  value: DimensionValue | undefined,
  set: (n: Node, v: number | "auto") => void,
): void {
  if (value === undefined) return;
  set(node, value);
}

function applyEdgeValue(
  node: Node,
  value: EdgeValue | undefined,
  edge: Edge,
  set: (n: Node, e: Edge, v: number | "auto") => void,
): void {
  if (value === undefined) return;
  set(node, edge, value);
}

export function applyStyle(node: Node, style: LayoutStyle): void {
  if (style.flexDirection) node.setFlexDirection(FLEX_DIR_MAP[style.flexDirection]);
  if (style.justifyContent) node.setJustifyContent(JUSTIFY_MAP[style.justifyContent]);
  if (style.alignItems) node.setAlignItems(ALIGN_MAP[style.alignItems]);
  if (style.alignSelf) node.setAlignSelf(ALIGN_MAP[style.alignSelf]);
  if (style.overflow) node.setOverflow(OVERFLOW_MAP[style.overflow]);
  if (style.position) node.setPositionType(POSITION_MAP[style.position]);
  if (style.display) node.setDisplay(style.display === "flex" ? Display.Flex : Display.None);

  if (style.flex !== undefined) {
    node.setFlexGrow(style.flex);
    node.setFlexShrink(style.flex);
    node.setFlexBasis(0);
  } else {
    if (style.flexGrow !== undefined) node.setFlexGrow(style.flexGrow);
    if (style.flexShrink !== undefined) node.setFlexShrink(style.flexShrink);
    if (style.flexBasis !== undefined) node.setFlexBasis(style.flexBasis);
  }

  applyDimension(node, style.width, (n, v) => n.setWidth(v));
  applyDimension(node, style.height, (n, v) => n.setHeight(v));
  applyDimension(node, style.minWidth, (n, v) => n.setMinWidth(v));
  applyDimension(node, style.minHeight, (n, v) => n.setMinHeight(v));
  applyDimension(node, style.maxWidth, (n, v) => n.setMaxWidth(v));
  applyDimension(node, style.maxHeight, (n, v) => n.setMaxHeight(v));

  const p = style.padding;
  const pX = style.paddingX ?? p;
  const pY = style.paddingY ?? p;
  if (style.paddingTop !== undefined) node.setPadding(Edge.Top, style.paddingTop);
  else if (pY !== undefined) node.setPadding(Edge.Top, pY);
  if (style.paddingBottom !== undefined) node.setPadding(Edge.Bottom, style.paddingBottom);
  else if (pY !== undefined) node.setPadding(Edge.Bottom, pY);
  if (style.paddingLeft !== undefined) node.setPadding(Edge.Left, style.paddingLeft);
  else if (pX !== undefined) node.setPadding(Edge.Left, pX);
  if (style.paddingRight !== undefined) node.setPadding(Edge.Right, style.paddingRight);
  else if (pX !== undefined) node.setPadding(Edge.Right, pX);

  const m = style.margin;
  const mX = style.marginX ?? m;
  const mY = style.marginY ?? m;
  if (style.marginTop !== undefined) node.setMargin(Edge.Top, style.marginTop);
  else if (mY !== undefined) node.setMargin(Edge.Top, mY);
  if (style.marginBottom !== undefined) node.setMargin(Edge.Bottom, style.marginBottom);
  else if (mY !== undefined) node.setMargin(Edge.Bottom, mY);
  if (style.marginLeft !== undefined) node.setMargin(Edge.Left, style.marginLeft);
  else if (mX !== undefined) node.setMargin(Edge.Left, mX);
  if (style.marginRight !== undefined) node.setMargin(Edge.Right, style.marginRight);
  else if (mX !== undefined) node.setMargin(Edge.Right, mX);

  applyEdgeValue(node, style.top, Edge.Top, (n, e, v) => n.setPosition(e, v));
  applyEdgeValue(node, style.bottom, Edge.Bottom, (n, e, v) => n.setPosition(e, v));
  applyEdgeValue(node, style.left, Edge.Left, (n, e, v) => n.setPosition(e, v));
  applyEdgeValue(node, style.right, Edge.Right, (n, e, v) => n.setPosition(e, v));

  const b = style.border;
  if (style.borderTop !== undefined) node.setBorder(Edge.Top, style.borderTop);
  else if (b !== undefined) node.setBorder(Edge.Top, b);
  if (style.borderBottom !== undefined) node.setBorder(Edge.Bottom, style.borderBottom);
  else if (b !== undefined) node.setBorder(Edge.Bottom, b);
  if (style.borderLeft !== undefined) node.setBorder(Edge.Left, style.borderLeft);
  else if (b !== undefined) node.setBorder(Edge.Left, b);
  if (style.borderRight !== undefined) node.setBorder(Edge.Right, style.borderRight);
  else if (b !== undefined) node.setBorder(Edge.Right, b);

  if (style.gap !== undefined) {
    node.setGap(Gutter.All, style.gap);
  }
}

export type PasteEvent = { text: string };

export interface IRenderer {
  requestPaint(): void;
  getFocusedRenderable(): Renderable | null;
  setFocusedRenderable(r: Renderable | null): void;
}

export abstract class Renderable {
  readonly yogaNode: Node;
  parent: Renderable | null = null;
  children: Renderable[] = [];

  private _renderer?: IRenderer;
  private _dirty = true;
  private _visible = true;
  private _focusable: boolean;
  private _focused = false;
  private _style: LayoutStyle;
  readonly id: string;

  handleKeyPress?: (key: KeyEvent) => boolean | undefined;
  handlePaste?: (event: PasteEvent) => void;

  renderAfter?: (canvas: Canvas, x: number, y: number, w: number, h: number) => void;

  translateY = 0;
  clipChildren = false;

  constructor(options: RenderableOptions = {}) {
    this.yogaNode = Node.create();
    this.id = options.id ?? `r-${Math.random().toString(36).slice(2, 9)}`;
    this._style = { ...options.style };
    this._focusable = options.focusable ?? false;
    this._visible = options.visible ?? true;
    this.yogaNode.setDisplay(this._visible ? Display.Flex : Display.None);
    applyStyle(this.yogaNode, this._style);
  }

  get renderer(): IRenderer | undefined {
    if (this._renderer) return this._renderer;
    return this.parent?.renderer;
  }

  _setRenderer(r: IRenderer | undefined): void {
    this._renderer = r;
  }

  get dirty(): boolean {
    return this._dirty;
  }

  markDirty(): void {
    this._dirty = true;
  }

  markClean(): void {
    this._dirty = false;
  }

  requestRender(): void {
    this.markDirty();
    this.renderer?.requestPaint();
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(value: boolean) {
    if (this._visible === value) return;
    this._visible = value;
    this.yogaNode.setDisplay(value ? Display.Flex : Display.None);
    this.requestRender();
  }

  get focusable(): boolean {
    return this._focusable;
  }

  set focusable(value: boolean) {
    this._focusable = value;
  }

  get focused(): boolean {
    return this._focused;
  }

  focus(): void {
    if (this._focused || !this._focusable) return;
    const r = this.renderer;
    if (r) {
      const prev = r.getFocusedRenderable();
      if (prev && prev !== this) prev.blur();
    }
    this._focused = true;
    r?.setFocusedRenderable(this);
    this.requestRender();
  }

  blur(): void {
    if (!this._focused) return;
    this._focused = false;
    const r = this.renderer;
    if (r && r.getFocusedRenderable() === this) r.setFocusedRenderable(null);
    this.requestRender();
  }

  get style(): LayoutStyle {
    return this._style;
  }

  setStyle(style: Partial<LayoutStyle>): void {
    this._style = { ...this._style, ...style };
    applyStyle(this.yogaNode, this._style);
    this.yogaNode.markDirty();
    this.requestRender();
  }

  add(child: Renderable, index?: number): void {
    if (child.parent) child.parent.remove(child);
    child.parent = this;
    if (index === undefined || index >= this.children.length) {
      this.children.push(child);
      this.yogaNode.insertChild(child.yogaNode, this.yogaNode.getChildCount());
    } else {
      this.children.splice(index, 0, child);
      this.yogaNode.insertChild(child.yogaNode, index);
    }
    child.markDirty();
    this.requestRender();
  }

  remove(child: Renderable): void {
    const idx = this.children.indexOf(child);
    if (idx === -1) return;
    this.children.splice(idx, 1);
    if (this.yogaNode.getChildCount() > 0) {
      this.yogaNode.removeChild(child.yogaNode);
    }
    child.parent = null;
    this.requestRender();
  }

  removeAllChildren(): void {
    for (const c of this.children) c.parent = null;
    this.children = [];
    // yoga-layout-tui has no removeAllChildren() — pop them one by one.
    // Snapshot first because removeChild mutates the array.
    const kids = [...this.yogaNode.children];
    for (const k of kids) this.yogaNode.removeChild(k);
    this.requestRender();
  }

  destroy(): void {
    this.removeAllChildren();
    this.parent?.remove(this);
    if (this._focused) this.blur();
    this.yogaNode.free();
  }

  findDescendantById(id: string): Renderable | undefined {
    for (const c of this.children) {
      if (c.id === id) return c;
      const found = c.findDescendantById(id);
      if (found) return found;
    }
    return undefined;
  }

  get computedLeft(): number {
    return this.yogaNode.getComputedLeft();
  }

  get computedTop(): number {
    return this.yogaNode.getComputedTop();
  }

  get computedWidth(): number {
    return this.yogaNode.getComputedWidth();
  }

  get computedHeight(): number {
    return this.yogaNode.getComputedHeight();
  }

  abstract render(canvas: Canvas, x: number, y: number, w: number, h: number): void;
}
