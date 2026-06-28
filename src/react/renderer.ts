// src/react/renderer.ts — React 19 entry point.
//
// Mirrors `new Renderer(opts).mount(rootBox)` from the imperative core but
// wraps a React element tree inside an imperative Box root. Children of
// `<rootBox>` (a host element React renders into) become imperative Renderables.
//
// Pattern: opentui/packages/react/src/reconciler/reconciler.ts::_render.

import { Box } from "../components/box.ts";
import { Renderer } from "../core/renderer.ts";

import { createReactRoot, reconciler } from "./reconciler.ts";
import type { Container } from "./types.ts";

export interface RenderOptions {
  alternate?: boolean;
  mouse?: boolean;
  width?: number;
  height?: number;
  /**
   * Mouse-click autoFocus (opentui-style). When `true` (default), clicking
   * a focusable Renderable focuses it. Disable for pure keyboard-driven UIs.
   */
  autoFocus?: boolean;
  /** Called once after `unmount()` finishes tearing the tree down. */
  onExit?: () => void;
}

export interface RenderHandle {
  /** Tear down the React tree, dispose the imperative renderer, fire onExit. */
  unmount: () => void;
  /** Underlying imperative Renderer (for advanced use / tests). */
  renderer: Renderer;
  /** Root Box that hosts React's first level of children. */
  rootBox: Box;
}

export function render(element: React.ReactElement, options: RenderOptions = {}): RenderHandle {
  const renderer = new Renderer({
    alternate: options.alternate,
    mouse: options.mouse,
    width: options.width,
    height: options.height,
    autoFocus: options.autoFocus,
  });
  const rootBox = new Box({});
  renderer.mount(rootBox);

  const container: Container = {
    renderer,
    rootBox,
    requestRender: () => renderer.requestPaint(),
  };
  const reactRoot = createReactRoot(container);
  reconciler.updateContainer(element, reactRoot, null, () => {});

  return {
    unmount() {
      // Push a null element through React so the reconciler releases the
      // tree, then dispose the imperative renderer.
      reconciler.updateContainer(null, reactRoot, null, () => {
        renderer.destroy();
        options.onExit?.();
      });
    },
    renderer,
    rootBox,
  };
}