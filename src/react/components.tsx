// src/react/components.tsx — React 19 function components that delegate to
// the hostConfig's lowercase intrinsic tags via React.createElement.
//
// Why PascalCase React components instead of JSX intrinsic tags:
//   React.JSX.IntrinsicElements already declares `text` (SVG) and `TextArea`
//   (HTML) with prop shapes incompatible with our imperative-friendly
//   `(v: string) => void` / `color: string | number` props. TypeScript
//   interface merge cannot override these — the existing entries always win
//   and conflict with our additions.
//
//   React 19 lets function components accept `ref` as a normal prop (no
//   forwardRef needed), so the user-facing component API is identical to a
//   PascalCase intrinsic — `<Box ref={ref}>` reads naturally and forwards
//   `ref.current` straight to the imperative Renderable.
//
// Implementation: we use React.createElement("box", ...) with `as any` casts
// to bypass TypeScript's IntrinsicElements check on the lowercase tag. The
// reconciler routes the call to our hostConfig.createInstance anyway.

import * as React from "react";

import type { BoxProps, ScrollBoxProps, TextAreaProps, TextProps } from "./types.ts";

const h = React.createElement as unknown as (
  type: string,
  props: Record<string, unknown> | null,
  ...children: React.ReactNode[]
) => React.ReactElement;

export function Box(props: BoxProps): React.ReactElement {
  const { children, style, ...rest } = props;
  return h("box", { ...rest, style }, children);
}

export function Text(props: TextProps): React.ReactElement {
  const { style, ...rest } = props;
  return h("text", { ...rest, style });
}

export function TextArea(props: TextAreaProps): React.ReactElement {
  const { style, ...rest } = props;
  return h("textarea", { ...rest, style });
}

export function ScrollBox(props: ScrollBoxProps): React.ReactElement {
  const { children, style, ...rest } = props;
  return h("scrollbox", { ...rest, style }, children);
}
