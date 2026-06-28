// src/index.ts — public command-style API.
//
// Usage:
//   import { Renderer, Box, Text, Textarea, Scrollbox, Scrollback, rgb } from "retty-ui";
//   const renderer = new Renderer({ alternate: true });
//   const root = new Box({ style: { ... } });
//   renderer.mount(root);
//
// For the React 19 bindings, import from "retty-ui/react" instead.

export * from "./core/index.ts";
export * from "./components/index.ts";
