// examples/agent-react.tsx — React 19 bindings demo.
//
// Run with:  bun run example:react
//
// Mirrors `examples/agent-imperative.ts` (same layout, same colors) but
// expressed as JSX. Demonstrates:
//   - ref={textareaRef} → imperative API on the underlying Renderable
//   - useInput for global shortcuts (Ctrl+C to exit)
//   - Declarative <TextArea focused /> (auto-set after each submit)
//   - onSubmit wiring through the React reconciler

import { useEffect, useRef, useState } from "react";
import type { ScrollBox as ScrollboxCls } from "../src/components/ScrollBox.ts";
import type { TextArea as TextareaCls } from "../src/components/TextArea.ts";
import { Box, render, ScrollBox, Text, TextArea, useApp, useInput } from "../src/react/index.ts";

interface LogLine {
  id: number;
  kind: "user" | "bot" | "system";
  text: string;
}

function App() {
  const [logs, setLogs] = useState<LogLine[]>(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      kind: "system" as const,
      text: `[boot] line ${i + 1}`,
    })),
  );
  const [input, setInput] = useState("");
  const nextIdRef = useRef(logs.length);

  const textareaRef = useRef<TextareaCls>(null);
  const scrollboxRef = useRef<ScrollboxCls>(null);

  const { unmount } = useApp();

  // Global shortcuts (fan-out: every useInput listener gets every keypress).
  useInput((_input, key) => {
    if (key.ctrl && key.name === "c") {
      unmount();
    }
    if (key.name === "pageup") scrollboxRef.current?.scrollBy(-5);
    if (key.name === "pagedown") scrollboxRef.current?.scrollBy(5);
  });

  const onSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const id = nextIdRef.current++;
    setLogs((prev) => [...prev, { id, kind: "user", text: `[You]: ${trimmed}` }]);
    setInput("");
    // Re-focus after submit (declarative focus is also valid via setState).
    textareaRef.current?.focus();
    // Stub the bot reply; real apps would call their agent here.
    setTimeout(() => {
      const botId = nextIdRef.current++;
      setLogs((prev) => [...prev, { id: botId, kind: "bot", text: `[Bot]: echo ${trimmed}` }]);
    }, 80);
  };

  // Auto-focus the TextArea on first mount.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <Box style={{ flexDirection: "column", height: 24, width: 80 }}>
      <Box
        style={{ height: 3, paddingX: 1, flexDirection: "row" }}
        borderStyle="double"
        borderColor="#3b8eea"
      >
        <Text text="Retty TUI " color="#3b8eea" bold />
        <Text text="v0.3.0 (react)" color="#787878" dim />
      </Box>

      <Box
        style={{ flexGrow: 1, paddingX: 1, paddingY: 1, flexDirection: "column" }}
        borderStyle="single"
        borderColor="#5a5a5a"
      >
        <Text text="--- Agent History Logs ---" color="#787878" dim />
        <ScrollBox ref={scrollboxRef} style={{ flexGrow: 1 }}>
          {logs.map((line) => {
            const color =
              line.kind === "user" ? "#64c8ff" : line.kind === "bot" ? "#ffc864" : "#b4b4b4";
            return <Text key={line.id} text={line.text} color={color} />;
          })}
        </ScrollBox>
      </Box>

      <Box
        style={{ minHeight: 3, paddingX: 1, paddingY: 0, flexDirection: "row" }}
        borderStyle="round"
        borderColor="#00c864"
      >
        <Text text="$ " color="#00c864" bold />
        <TextArea
          ref={textareaRef}
          value={input}
          placeholder="Type a message... (Ctrl+C to exit, PgUp/PgDn to scroll)"
          placeholderColor="#646464"
          color="#e6e6e6"
          style={{ flexGrow: 1 }}
          onChange={setInput}
          onSubmit={onSubmit}
        />
      </Box>
    </Box>
  );
}

render(<App />, { alternate: true, mouse: false });
