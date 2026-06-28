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

// Imperative classes (also exposed, useful for advanced users / tests).
export {
  Box as BoxImpl,
  ScrollBox as ScrollboxImpl,
  Text as TextImpl,
  TextArea as TextareaImpl,
} from "../components/index.ts";
// Color + style utilities (re-exported from imperative core for ergonomic JSX).
export { COLOR_DEFAULT, parseColor, rgb, StyleFlags } from "../core/index.ts";
export type { LayoutStyle } from "../core/renderable.ts";
// PascalCase React components — the user-facing API. They accept `ref` as a
// normal React 19 prop and forward it to the underlying imperative Renderable
// (Box / Text / TextArea / ScrollBox) for direct method calls.
export { Box, ScrollBox, Text, TextArea } from "./components.tsx";
export type { AppContextValue, UseFocusApi, UseInputOptions } from "./hooks.ts";

export {
  setActiveApp,
  useApp,
  useEffectEvent,
  useFocus,
  useInput,
  useMouse,
  usePaste,
} from "./hooks.ts";
export type { RenderHandle, RenderOptions } from "./renderer.ts";
export { render } from "./renderer.ts";
export type {
  BoxProps,
  Container,
  ScrollBoxProps,
  TextAreaProps,
  TextProps,
} from "./types.ts";
