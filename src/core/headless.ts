import { Canvas } from "./canvas.ts";
import { Renderable } from "./renderable.ts";
import { Direction } from "./yoga.ts";

export interface HeadlessResult {
  canvas: Canvas;
  root: Renderable;
}

export function renderHeadless(root: Renderable, width: number, height: number): HeadlessResult {
  const canvas = new Canvas(width, height);
  canvas.clear();
  root.yogaNode.calculateLayout(width, height, Direction.LTR);
  renderNodeHeadless(root, canvas, 0, 0, width, height);
  return { canvas, root };
}

function renderNodeHeadless(
  node: Renderable,
  canvas: Canvas,
  x: number,
  y: number,
  _w: number,
  _h: number,
): void {
  if (!node.visible) return;
  // yoga-layout-tui's getComputedLeft/Top return offsets RELATIVE to the
  // parent (matches upstream Yoga C++ / Yoga JS WASM / Ink TS port / v0.2
  // Zig FFI). We accumulate the parent chain at recursion time.
  //
  // `translateY` is a render-time visual offset (used by ScrollBox's
  // three-layer translation trick to scroll content without re-laying
  // out). It is NOT in the yoga position, so we add it here at every
  // level — recursion's y accumulation naturally composes the parent
  // chain's translateY into each descendant.
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
    renderNodeHeadless(child, canvas, nx, ny, nw, nh);
  }
  node.renderAfter?.(canvas, nx, ny, nw, nh);

  if (pushed) canvas.popClip();
}
