import { Canvas, COLOR_DEFAULT, StyleFlags } from "./canvas.ts";
import { Screen } from "./screen.ts";
import { inputManager, type KeyEvent, type MouseEvent, type MouseCallback } from "./input.ts";
import { Renderable, type IRenderer, type PasteEvent } from "./renderable.ts";
import { Direction } from "./yoga.ts";

export interface RendererOptions {
  alternate?: boolean;
  mouse?: boolean;
  width?: number;
  height?: number;
  /**
   * When `true` (default), a left-click on a `focusable` Renderable focuses it
   * (opentui-style autoFocus). The click is also propagated to other mouse
   * listeners via `inputManager.addMouseListener`. Set `false` to disable.
   */
  autoFocus?: boolean;
}

export class Renderer implements IRenderer {
  readonly screen: Screen;
  readonly front: Canvas;
  readonly back: Canvas;

  private root: Renderable | null = null;
  private focusedRenderable: Renderable | null = null;
  private paintScheduled = false;
  private destroyed = false;
  private keyListener: (input: string, key: KeyEvent) => void;
  private pasteListener: (text: string) => void;
  private mouseListener: MouseCallback | null = null;
  private autoFocus: boolean;

  constructor(options: RendererOptions = {}) {
    this.screen = new Screen({ alternate: options.alternate ?? true });
    const { width, height } = this.screen.size;
    this.front = new Canvas(options.width ?? width, options.height ?? height);
    this.back = new Canvas(options.width ?? width, options.height ?? height);
    this.autoFocus = options.autoFocus ?? true;

    this.keyListener = (input, key) => this.handleKey(input, key);
    this.pasteListener = (text) => this.handlePaste({ text });
  }

  mount(root: Renderable): void {
    if (this.destroyed) return;
    this.root = root;
    root._setRenderer(this);
    this.attachAll(root);

    this.screen.setup();
    if (this.screen) {
      this.screen.onResize(() => this.handleResize());
    }
    if (this.root) {
      inputManager.addListener(this.keyListener);
      inputManager.addPasteListener(this.pasteListener);
    }

    // Synchronous layout pass so hitTest has valid bbox on the first mouse event.
    if (this.root) {
      const { width, height } = this.screen.size;
      this.root.yogaNode.calculateLayout(width, height, Direction.LTR);
    }

    if (this.autoFocus) {
      this.mouseListener = (event) => this.handleMouse(event);
      inputManager.addMouseListener(this.mouseListener);
    }

    this.requestPaint();
  }

  private attachAll(r: Renderable): void {
    r._setRenderer(this);
    for (const c of r.children) this.attachAll(c);
  }

  start(): void {
    this.requestPaint();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    inputManager.removeListener(this.keyListener);
    inputManager.removePasteListener(this.pasteListener);
    if (this.mouseListener) {
      inputManager.removeMouseListener(this.mouseListener);
      this.mouseListener = null;
    }
    this.screen.cleanup();
  }

  getFocusedRenderable(): Renderable | null {
    return this.focusedRenderable;
  }

  setFocusedRenderable(r: Renderable | null): void {
    this.focusedRenderable = r;
  }

  requestPaint(): void {
    if (this.paintScheduled || this.destroyed) return;
    this.paintScheduled = true;
    setImmediate(() => this.paint());
  }

  private paint(): void {
    this.paintScheduled = false;
    if (this.destroyed || !this.root) return;

    const { width, height } = this.screen.size;
    if (this.back.width !== width || this.back.height !== height) {
      this.back.resize(width, height);
      this.front.resize(width, height);
    }

    this.back.clear();
    this.root.yogaNode.calculateLayout(width, height, Direction.LTR);
    this.renderNode(this.root, this.back, 0, 0, width, height);
    this.flush();
  }

  private renderNode(node: Renderable, canvas: Canvas, x: number, y: number, _w: number, _h: number): void {
    if (!node.visible) return;
    const nx = x + node.computedLeft;
    const ny = y + node.computedTop + node.translateY;
    const nw = node.computedWidth;
    const nh = node.computedHeight;

    let pushed = false;
    if (node.clipChildren && nw > 0 && nh > 0) {
      canvas.pushClip(nx, ny, nw, nh);
      pushed = true;
    }

    node.render(canvas, nx, ny, nw, nh);
    node.markClean();
    for (const child of node.children) {
      this.renderNode(child, canvas, nx, ny, nw, nh);
    }
    node.renderAfter?.(canvas, nx, ny, nw, nh);

    if (pushed) canvas.popClip();
  }

  private flush(): void {
    let out = "";
    let initialized = false;
    let currentX = -1;
    let currentY = -1;
    let currentFg = COLOR_DEFAULT;
    let currentBg = COLOR_DEFAULT;
    let currentStyle = 0;

    const { back, front } = this;
    for (let y = 0; y < back.height; y++) {
      for (let x = 0; x < back.width; x++) {
        const off = (y * back.width + x) * 3;
        const backVal = back.buffer[off]!;
        const backFg = back.buffer[off + 1]!;
        const backBg = back.buffer[off + 2]!;

        if ((backVal & StyleFlags.Continuation) !== 0) {
          front.buffer[off] = backVal;
          front.buffer[off + 1] = backFg;
          front.buffer[off + 2] = backBg;
          if (currentX !== -1) currentX++;
          continue;
        }

        const frontVal = front.buffer[off]!;
        const frontFg = front.buffer[off + 1]!;
        const frontBg = front.buffer[off + 2]!;

        if (backVal === frontVal && backFg === frontFg && backBg === frontBg) {
          currentX = -1;
          currentY = -1;
          continue;
        }

        if (!initialized) {
          out += "\x1b[0m";
          initialized = true;
        }

        if (currentX !== x || currentY !== y) {
          out += `\x1b[${y + 1};${x + 1}H`;
          currentX = x;
          currentY = y;
        }

        const backStyle = backVal & 0x0fe00000;
        if (backStyle !== currentStyle || backFg !== currentFg || backBg !== currentBg) {
          const stylesOff = (currentStyle & ~backStyle) !== 0;
          const fgOff = currentFg !== COLOR_DEFAULT && backFg === COLOR_DEFAULT;
          const bgOff = currentBg !== COLOR_DEFAULT && backBg === COLOR_DEFAULT;
          if (stylesOff || fgOff || bgOff) {
            out += "\x1b[0m";
            currentStyle = 0;
            currentFg = COLOR_DEFAULT;
            currentBg = COLOR_DEFAULT;
          }
          const enable = backStyle & ~currentStyle;
          if ((enable & StyleFlags.Bold) !== 0) out += "\x1b[1m";
          if ((enable & StyleFlags.Dim) !== 0) out += "\x1b[2m";
          if ((enable & StyleFlags.Italic) !== 0) out += "\x1b[3m";
          if ((enable & StyleFlags.Underline) !== 0) out += "\x1b[4m";
          if ((enable & StyleFlags.Blink) !== 0) out += "\x1b[5m";
          if ((enable & StyleFlags.Inverse) !== 0) out += "\x1b[7m";
          if ((enable & StyleFlags.Strikethrough) !== 0) out += "\x1b[9m";
          currentStyle = backStyle;

          if (backFg !== currentFg) {
            if (backFg === COLOR_DEFAULT) out += "\x1b[39m";
            else out += `\x1b[38;2;${(backFg >> 16) & 0xff};${(backFg >> 8) & 0xff};${backFg & 0xff}m`;
            currentFg = backFg;
          }
          if (backBg !== currentBg) {
            if (backBg === COLOR_DEFAULT) out += "\x1b[49m";
            else out += `\x1b[48;2;${(backBg >> 16) & 0xff};${(backBg >> 8) & 0xff};${backBg & 0xff}m`;
            currentBg = backBg;
          }
        }

        out += String.fromCodePoint(backVal & 0x1fffff);
        currentX += (backVal & StyleFlags.Wide) !== 0 ? 2 : 1;
        front.buffer[off] = backVal;
        front.buffer[off + 1] = backFg;
        front.buffer[off + 2] = backBg;
      }
    }

    if (out.length > 0) this.screen.write(out);
  }

  private handleKey(_input: string, key: KeyEvent): void {
    if (this.focusedRenderable?.handleKeyPress) {
      const handled = this.focusedRenderable.handleKeyPress(key);
      if (handled) return;
    }
    if (key.ctrl && key.name === "c") {
      this.destroy();
      process.exit(0);
    }
  }

  private handlePaste(event: PasteEvent): void {
    this.focusedRenderable?.handlePaste?.(event);
  }

  private handleResize(): void {
    this.requestPaint();
  }

  /**
   * Hit-test a screen-space (x, y) against the rendered tree.
   * Returns the deepest visible Renderable whose bbox contains (x, y),
   * or null if no hit. Public for testing.
   */
  hitTest(x: number, y: number): Renderable | null {
    if (!this.root) return null;
    return this.hitTestNode(this.root, 0, 0, x, y);
  }

  private hitTestNode(node: Renderable, ox: number, oy: number, x: number, y: number): Renderable | null {
    if (!node.visible) return null;
    const absLeft = ox + node.computedLeft;
    const absTop = oy + node.computedTop;
    const w = node.computedWidth;
    const h = node.computedHeight;
    if (w <= 0 || h <= 0) return null;
    if (x < absLeft || x >= absLeft + w) return null;
    if (y < absTop || y >= absTop + h) return null;
    // Walk children back-to-front so the visually-topmost wins.
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i]!;
      const hit = this.hitTestNode(child, absLeft, absTop, x, y);
      if (hit) return hit;
    }
    return node;
  }

  /**
   * Mouse handler: on left-button down, walk up the hit-test target until
   * a focusable ancestor is found, then focus it. (opentui autoFocus pattern.)
   */
  private handleMouse(event: MouseEvent): void {
    if (event.button !== 0 || event.release || event.motion) return;
    if (event.wheel) return;
    const hit = this.hitTest(event.x, event.y);
    if (!hit) return;
    let target: Renderable | null = hit;
    while (target && !target.focusable) target = target.parent;
    target?.focus();
  }
}