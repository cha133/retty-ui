# retty-ui

> Imperative TUI core + React 19 bindings. Pure TypeScript, zero native dependencies.

Build terminal UIs the same way you build web UIs — declarative React 19 components, OR a small imperative API if React feels like overkill for your agent. Layout is computed by [yoga-layout-tui](https://github.com/cha133/yoga-layout-tui) (pure-TS flexbox, no Zig, no WASM, no native binary).

```
┌────────────────────────────────────┐
│  src/react/    (React 19 binding)  │
└────────────┬───────────────────────┘
             │
┌────────────▼───────────────────────┐
│  src/core/     (imperative core)   │
│  - Renderable, Canvas, Renderer    │
│  - Box, Text, TextArea, ScrollBox  │
└────────────┬───────────────────────┘
             │
┌────────────▼───────────────────────┐
│  yoga-layout-tui  (pure-TS flexbox)│
└────────────────────────────────────┘
```

The **imperative core** is shared between the command-style API (`retty-ui`) and the React reconciler (`retty-ui/react`). The React layer is a thin adapter that maps props to command-style setters — the actual work (layout, render, IME / focus / cursor state) stays in the core.

## Install

```bash
bun add retty-ui
```

Requires [Bun](https://bun.sh) 1.3+ as the runtime.

## Quick start — command-style

```ts
import { Box, Renderer, rgb, ScrollBox, Text, TextArea } from "retty-ui";

const renderer = new Renderer({ alternate: true });

const root = new Box({ style: { flexDirection: "column", height: 24, width: 80 } });

const header = new Box({ style: { height: 3 }, borderStyle: "double", borderColor: rgb(59, 142, 234) });
header.add(new Text("Retty TUI ", { color: rgb(59, 142, 234), bold: true }));
root.add(header);

const logs = new ScrollBox({ style: { flexGrow: 1, borderStyle: "single" } });
for (let i = 1; i <= 5; i++) logs.add(new Text(`[boot] line ${i}`));
root.add(logs);

const input = new Box({ style: { minHeight: 3, flexDirection: "row" }, borderStyle: "round" });
const ta = new TextArea({ placeholder: "Type a message… (Ctrl+C to exit)", style: { flexGrow: 1 } });
input.add(new Text("$ ", { bold: true }));
input.add(ta);
root.add(input);

renderer.mount(root);
ta.focus();
renderer.start();
```

Run with `bun run demo.ts` (or `bunx retty-ui` if you prefer the bundled CLI).

## Quick start — React 19

```tsx
import { useRef, useState } from "react";
import { Box, render, ScrollBox, Text, TextArea, useApp, useInput } from "retty-ui/react";

function App() {
  const [logs, setLogs] = useState<string[]>(["hello"]);
  const [input, setInput] = useState("");
  const ta = useRef<TextArea>(null);
  const { unmount } = useApp();

  useInput((_, key) => {
    if (key.ctrl && key.name === "c") unmount();
  });

  return (
    <Box style={{ flexDirection: "column", height: 24, width: 80 }}>
      <Box style={{ height: 3 }} borderStyle="double" borderColor="#3b8eea">
        <Text text="Retty TUI " color="#3b8eea" bold />
      </Box>

      <ScrollBox style={{ flexGrow: 1 }} borderStyle="single">
        {logs.map((line, i) => <Text key={i} text={line} />)}
      </ScrollBox>

      <Box style={{ minHeight: 3, flexDirection: "row" }} borderStyle="round">
        <Text text="$ " bold />
        <TextArea
          ref={ta}
          value={input}
          placeholder="Type a message…"
          onChange={setInput}
          onSubmit={(v) => {
            setLogs((p) => [...p, `[you]: ${v}`]);
            setInput("");
            ta.current?.focus();
          }}
        />
      </Box>
    </Box>
  );
}

render(<App />, { alternate: true });
```

## Components

| Component | Purpose | Key props |
|---|---|---|
| `Box` | Container (flexbox layout, optional border) | `style`, `borderStyle`, `borderColor` |
| `Text` | Single/multi-line text | `text`, `color`, `bold`/`italic`/`dim`/… |
| `TextArea` | Input box with IME composing + cursor | `value`, `onChange`, `onSubmit`, `placeholder` |
| `ScrollBox` | Scrollable viewport over child nodes | `scrollBy`, `scrollTo`, `scrollToBottom` |

Border styles: `"single"` | `"double"` | `"round"` | `"classic"` | `"none"`.

## Hooks (React)

| Hook | Purpose |
|---|---|
| `useApp()` | Returns `{ unmount }` — exit the rendered app cleanly |
| `useInput(cb, opts?)` | Subscribe to every keystroke (fan-out, all listeners receive all keys) |
| `useFocus()` | Returns `{ isFocused, focus, blur }` |
| `useMouse(cb)` | Subscribe to mouse events (requires `mouse: true` in render options) |
| `usePaste(cb)` | Subscribe to bracketed paste events |
| `useEffectEvent(fn)` | Stable callback ref (React `useEffectEvent` polyfill) |

## Imperative core (advanced)

If you don't want React, the imperative core exposes:

- `Renderer` — alternate-screen + double-buffered diff renderer
- `Canvas` — direct cell-buffer access (for custom paints)
- `inputManager` — raw mode + key/mouse/paste decoding
- `renderHeadless(tree)` — render to a string (tests, snapshots)
- `layoutText(s, maxWidth)` — soft-wrap text into `{ lines, width, height }`
- `Node`, `Edge`, `Direction`, `MeasureMode`, `Align`, `Display`, `FlexDirection`, `Gutter`, `Justify`, `Overflow`, `PositionType` — re-exports of the yoga-layout-tui enums

See [`AGENTS.md`](AGENTS.md) for build / test / typecheck commands and architectural notes.

## Why an imperative core?

The v0.1 React-centric version had three structural bugs (double data source, measure-cache lock-up, force-render storms). The v0.2 imperative core fixed them by owning state (IME composing, focus, cursor) outside React. v0.3 keeps the same core and just swaps the Zig FFI yoga layer for a pure-TS one.

## License

[MIT](LICENSE)