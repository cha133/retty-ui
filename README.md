# retty-ui

> Imperative TUI core + React 19 bindings. Pure TypeScript, zero native dependencies.

**Status: v0.3.0 in development.** Imperative core is being ported from v0.2 (Zig FFI) to v0.3 (pure-TS `yoga-layout-tui`), with a new React 19 reconciler on top.

See [`.claude/00-index.md`](.claude/00-index.md) and [`.claude/01-state.md`](.claude/01-state.md) for the current roadmap and progress (local working notes; not in git).

## Design

```
┌────────────────────────────────────┐
│  src/react/    (React 19 binding)  │
└────────────┬───────────────────────┘
             │
┌────────────▼───────────────────────┐
│  src/core/     (imperative core)   │
│  - Renderable, Canvas, Renderer    │
│  - Box, Text, Textarea, Scrollbox  │
└────────────┬───────────────────────┘
             │
┌────────────▼───────────────────────┐
│  yoga-layout-tui  (pure-TS flexbox)│
└────────────────────────────────────┘
```

The **imperative core** is shared between the command-line API (`retty-ui`) and the React reconciler (`retty-ui/react`). The React 19 layer is a thin adapter that maps props to command-style setters — the actual work (layout, render, input decoding) stays in the core.

## Install (once released)

```bash
bun add retty-ui
```

## Quick start

```ts
// Command-style API
import { render, Box, Text, Scrollbox, Input } from "retty-ui";

// React 19 API
import { render, Box, Text, Scrollbox, Input } from "retty-ui/react";
```

## Why an imperative core?

The v0.1 React-centric version had three structural bugs (double data source, measure cache lock-up, force-render storms). The v0.2 imperative core fixed them by owning state (IME composing, focus, cursor) outside React. v0.3 keeps the same core, just swaps the Zig FFI yoga layer for a pure-TS one.

## License

TBD
