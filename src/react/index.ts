// src/react/index.ts — public surface for `retty-ui/react`.
//
// Consumers: `import { render, Box, Text, TextArea, ScrollBox, useInput } from "retty-ui/react"`
//
// Also pulls in the global JSX intrinsic namespace registration so users can
// write <box>/<text>/<TextArea>/<ScrollBox> in their TSX without per-file
// imports.

// jsx-namespace.d.ts was removed — React 19's JSX.IntrinsicElements has
// `text` (SVG) and `TextArea` (HTML) with incompatible prop shapes that
// TypeScript interface merge can't override. We expose PascalCase React
// components in components.tsx that emit the lowercase hostConfig tags via
// React.createElement.
//
// Importing "react" here so React types are loaded for downstream consumers.
import "react";

export { render } from "./renderer.ts";
export type { RenderOptions, RenderHandle } from "./renderer.ts";

// PascalCase React components — the user-facing API. They accept `ref` as a
// normal React 19 prop and forward it to the underlying imperative Renderable
// (Box / Text / TextArea / ScrollBox) for direct method calls.
export { Box, Text, TextArea, ScrollBox } from "./components.tsx";

// Imperative classes (also exposed, useful for advanced users / tests).
export { Box as BoxImpl, Text as TextImpl, TextArea as TextareaImpl, ScrollBox as ScrollboxImpl } from "../components/index.ts";

export type {
  BoxProps,
  TextProps,
  TextAreaProps,
  ScrollBoxProps,
  Container,
} from "./types.ts";

export {
  setActiveApp,
  useApp,
  useInput,
  useMouse,
  usePaste,
  useFocus,
  useEffectEvent,
} from "./hooks.ts";
export type { AppContextValue, UseFocusApi, UseInputOptions } from "./hooks.ts";

// Color + style utilities (re-exported from imperative core for ergonomic JSX).
export { rgb, COLOR_DEFAULT, parseColor, StyleFlags } from "../core/index.ts";
export type { LayoutStyle } from "../core/renderable.ts";