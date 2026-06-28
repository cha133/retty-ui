// examples/agent-imperative.ts — command-style coding-agent demo.
//
// Run with:  bun run example:imperative
//
// Layout:
//   ┌─ Header (3 rows) ─────────────────┐
//   │ Title (bold blue)  v0.3.0 (dim)   │
//   ├─ Logs Box (flex: 1) ──────────────┤
//   │  --- Agent History Logs ---       │
//   │  <ScrollBox>                      │
//   ├─ Input Panel (3 rows) ────────────┤
//   │  $ <TextArea>                     │
//   └───────────────────────────────────┘

import { Box, ScrollBox, Text, TextArea } from "../src/components/index.ts";
import { Renderer, rgb } from "../src/index.ts";

const renderer = new Renderer({ alternate: true, mouse: false });

const root = new Box({ style: { flexDirection: "column", height: 24, width: 80 } });

const header = new Box({
  style: { height: 3, paddingX: 1, flexDirection: "row" },
  borderStyle: "double",
  borderColor: rgb(59, 142, 234),
});
header.add(new Text("Retty TUI ", { color: rgb(59, 142, 234), bold: true }));
header.add(new Text("v0.3.0", { color: rgb(120, 120, 120), dim: true }));
root.add(header);

const logsBox = new Box({
  style: { flexGrow: 1, paddingX: 1, paddingY: 1, flexDirection: "column" },
  borderStyle: "single",
  borderColor: rgb(90, 90, 90),
});
const logsTitle = new Text("--- Agent History Logs ---", { color: rgb(120, 120, 120), dim: true });
logsBox.add(logsTitle);

const scrollbox = new ScrollBox({ style: { flexGrow: 1 } });
for (let i = 1; i <= 30; i++) {
  scrollbox.add(new Text(`[User]: message line ${i}`, { color: rgb(180, 180, 180) }));
}
logsBox.add(scrollbox);
root.add(logsBox);

const inputPanel = new Box({
  style: { minHeight: 3, paddingX: 1, paddingY: 0, flexDirection: "row" },
  borderStyle: "round",
  borderColor: rgb(0, 200, 100),
});
const prompt = new Text("$ ", { color: rgb(0, 200, 100), bold: true });
const textarea = new TextArea({
  value: "",
  placeholder: "Type a message... (Ctrl+C to exit)",
  placeholderColor: rgb(100, 100, 100),
  color: rgb(230, 230, 230),
  style: { flexGrow: 1 },
  onSubmit: (value: string) => {
    scrollbox.add(new Text(`[You]: ${value}`, { color: rgb(100, 200, 255) }));
    textarea.value = "";
    textarea.focus();
  },
});
inputPanel.add(prompt);
inputPanel.add(textarea);
root.add(inputPanel);

renderer.mount(root);
textarea.focus();
renderer.start();
