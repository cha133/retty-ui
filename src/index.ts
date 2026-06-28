// src/index.ts — public command-style API.
//
// Usage:
//   import { Renderer, Box, Text, TextArea, ScrollBox, rgb } from "retty-ui";
//   const renderer = new Renderer({ alternate: true });
//   const root = new Box({ style: { ... } });
//   renderer.mount(root);
//
// For the React 19 bindings, import from "retty-ui/react" instead.

export * from "./components/index.ts";
export * from "./core/index.ts";
