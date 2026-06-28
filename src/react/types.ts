// src/react/types.ts — React 19 hostConfig type definitions and JSX prop interfaces.
//
// We model the four intrinsic elements <box>, <text>, <TextArea>, <ScrollBox>
// directly on top of the imperative Renderable hierarchy. Each prop interface
// mirrors the underlying imperative constructor's options + a few declarative
// convenience props (`focused`, `style`).

import type { ReactNode, Ref } from "react";
import type { Box } from "../components/box.ts";
import type { ScrollBox } from "../components/scrollbox.ts";
import type { Text } from "../components/text.ts";
import type { TextArea } from "../components/textarea.ts";
import type { LayoutStyle, RenderableOptions } from "../core/renderable.ts";
import type { Renderer } from "../core/renderer.ts";

// ────────────────────────────────────────────────────────────────────────────
// Host config types (consumed by react-reconciler).
// ────────────────────────────────────────────────────────────────────────────

export type Type = "box" | "text" | "textarea" | "scrollbox";
export type Props = Record<string, unknown>;
export type HostContext = Record<string, never>;
export type TextInstance = never;
export type HydratableInstance = unknown;
export type SuspenseInstance = unknown;
export type FormInstance = unknown;
export type ChildSet = unknown;
export type TimeoutHandle = ReturnType<typeof setTimeout>;
export type NoTimeout = -1;
export type TransitionStatus = unknown;
export type PublicInstance = import("../core/renderable.ts").Renderable;
export type Instance = PublicInstance;

export interface Container {
  /** Underlying imperative Renderer (manages screen, paint loop, focus). */
  renderer: Renderer;
  /** Root Box created by `render()`; React's <box>/<text> children attach here. */
  rootBox: Box;
  /** Hook React commits into the imperative paint loop. */
  requestRender: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Shared style-flags surface (bold/italic/...) lifted to top-level props
// for terser JSX. Color fields are `string` only (not `string | number`) to
// match React's HTMLAttributes convention and avoid intersection conflicts
// — our imperative `parseColor()` already handles hex/named strings.
// ────────────────────────────────────────────────────────────────────────────

export interface StyleFlagProps {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  strikethrough?: boolean;
  blink?: boolean;
  inverse?: boolean;
}

export interface ColorProps {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Box props (maps to `Box` in ../components/box.ts).
// ────────────────────────────────────────────────────────────────────────────

export interface BoxProps
  extends Omit<RenderableOptions, "style" | "borderColor">,
    StyleFlagProps,
    Omit<ColorProps, "borderColor"> {
  children?: ReactNode;
  /** Layout style (TUI flexbox subset — see LayoutStyle). */
  style?: LayoutStyle;
  borderStyle?: "single" | "double" | "round" | "classic" | "none";
  borderColor?: string;
  /** Declarative focus: true → focus(), false → blur(). Honored when focusable. */
  focused?: boolean;
  ref?: Ref<Box>;
}

// ────────────────────────────────────────────────────────────────────────────
// Text props (maps to `Text` in ../components/text.ts).
// ────────────────────────────────────────────────────────────────────────────

export interface TextProps extends Omit<RenderableOptions, "style">, StyleFlagProps, ColorProps {
  /** Text content. We do NOT read children — pass `text` directly (opentui style). */
  text: string;
  wrap?: boolean;
  style?: LayoutStyle;
  children?: never;
  ref?: Ref<Text>;
}

// ────────────────────────────────────────────────────────────────────────────
// TextArea props (maps to `TextArea` in ../components/textarea.ts).
// ────────────────────────────────────────────────────────────────────────────

export interface TextAreaProps
  extends Omit<RenderableOptions, "style">,
    StyleFlagProps,
    ColorProps {
  children?: never;
  style?: LayoutStyle;
  value?: string;
  placeholder?: string;
  placeholderColor?: string;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
  /** Declarative focus. TextArea is always focusable internally. */
  focused?: boolean;
  ref?: Ref<TextArea>;
}

// ────────────────────────────────────────────────────────────────────────────
// ScrollBox props (maps to `ScrollBox` in ../components/scrollbox.ts).
// ────────────────────────────────────────────────────────────────────────────

export interface ScrollBoxProps
  extends Omit<RenderableOptions, "style">,
    StyleFlagProps,
    ColorProps {
  children?: ReactNode;
  style?: LayoutStyle;
  onScroll?: (offset: number) => void;
  initialScrollOffset?: number;
  mouseScrollEnabled?: boolean;
  keyboardScrollEnabled?: boolean;
  showScrollbar?: boolean;
  /** Declarative focus. ScrollBox is always focusable internally. */
  focused?: boolean;
  ref?: Ref<ScrollBox>;
}
