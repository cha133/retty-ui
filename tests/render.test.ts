import { expect, test } from "bun:test";
import { Box, ScrollBox, Text, TextArea } from "../src/components/index.ts";
import { rgb } from "../src/core/canvas.ts";
import { renderHeadless } from "../src/core/headless.ts";

function buildAgentTree() {
  const root = new Box({ style: { flexDirection: "column", height: 24, width: 80 } });

  const header = new Box({
    style: { height: 3, paddingX: 1, flexDirection: "row" },
    borderStyle: "double",
    borderColor: rgb(59, 142, 234),
  });
  header.add(new Text("Retty TUI ", { color: rgb(59, 142, 234), bold: true }));
  header.add(new Text("v0.3.1", { color: rgb(120, 120, 120), dim: true }));
  root.add(header);

  const logsBox = new Box({
    style: { flexGrow: 1, paddingX: 1, paddingY: 1, flexDirection: "column" },
    borderStyle: "single",
    borderColor: rgb(90, 90, 90),
  });
  logsBox.add(new Text("--- Agent History Logs ---", { color: rgb(120, 120, 120), dim: true }));

  const scrollbox = new ScrollBox({ style: { flexGrow: 1 } });
  for (let i = 1; i <= 30; i++) {
    scrollbox.add(new Text(`[User]: line ${i}`, { color: rgb(180, 180, 180) }));
  }
  logsBox.add(scrollbox);
  root.add(logsBox);

  const inputPanel = new Box({
    style: { minHeight: 3, paddingX: 1, flexDirection: "row" },
    borderStyle: "round",
    borderColor: rgb(0, 200, 100),
  });
  inputPanel.add(new Text("$ ", { color: rgb(0, 200, 100), bold: true }));
  inputPanel.add(new TextArea({ value: "", placeholder: "Type...", style: { flexGrow: 1 } }));
  root.add(inputPanel);

  return { root, header, logsBox, scrollbox, inputPanel };
}

test("header renders with double border and title text", () => {
  const { root, header } = buildAgentTree();
  const { canvas } = renderHeadless(root, 80, 24);

  expect(header.computedHeight).toBe(3);
  expect(header.computedTop).toBe(0);

  const row0 = canvas.toString().split("\n")[0]!;
  expect(row0[0]).toBe("╔");
  expect(row0[79]).toBe("╗");

  const row1 = canvas.toString().split("\n")[1]!;
  expect(row1[0]).toBe("║");
  expect(row1.includes("Retty TUI")).toBe(true);
});

test("logs box fills space between header and input panel", () => {
  const { root, header, logsBox, inputPanel } = buildAgentTree();
  renderHeadless(root, 80, 24);

  expect(header.computedTop).toBe(0);
  expect(logsBox.computedTop).toBe(3);
  expect(inputPanel.computedTop).toBe(21);
  expect(logsBox.computedHeight).toBe(18);
});

test("ScrollBox shows first lines at top, border not covered", () => {
  const { root } = buildAgentTree();
  const { canvas } = renderHeadless(root, 80, 24);

  const lines = canvas.toString().split("\n");
  expect(lines[3]?.[0]).toBe("┌");
  expect(lines[3]?.[79]).toBe("┐");

  const contentRow = lines[6]!;
  expect(contentRow.includes("[User]: line 1")).toBe(true);
});

test("TextArea wraps to 2 rows when value exceeds width", () => {
  const root = new Box({ style: { flexDirection: "column", height: 10, width: 40 } });
  const ta = new TextArea({
    value: "a".repeat(60),
    style: { flexGrow: 1 },
  });
  root.add(ta);
  renderHeadless(root, 40, 10);

  expect(ta.computedHeight).toBeGreaterThanOrEqual(2);
});

test("measure/render consistency: computed height matches rendered rows", () => {
  const root = new Box({ style: { flexDirection: "column", width: 30 } });
  const ta = new TextArea({
    value: "a".repeat(50),
    style: {},
  });
  root.add(ta);
  const { canvas } = renderHeadless(root, 30, 10);

  const lines = canvas.toString().split("\n");
  let nonEmptyRows = 0;
  for (const line of lines) {
    if (line.includes("a")) nonEmptyRows++;
  }
  expect(nonEmptyRows).toBe(ta.computedHeight);
});

test("逐字符输入后 TextArea grow（无 measure cache 锁死）", () => {
  const root = new Box({ style: { flexDirection: "column", height: 10, width: 30 } });
  const ta = new TextArea({ value: "", style: { flexGrow: 1 } });
  root.add(ta);

  for (let i = 0; i < 40; i++) {
    ta.value = "a".repeat(i + 1);
  }
  renderHeadless(root, 30, 10);
  expect(ta.computedHeight).toBeGreaterThanOrEqual(2);
});

test("placeholder shows when unfocused and empty", () => {
  const root = new Box({ style: { width: 40, height: 3 } });
  const ta = new TextArea({
    value: "",
    placeholder: "Type here...",
    style: { flexGrow: 1 },
  });
  root.add(ta);
  const { canvas } = renderHeadless(root, 40, 3);

  expect(canvas.toString().includes("Type here...")).toBe(true);
});

test("placeholder hidden when focused and has value", () => {
  const root = new Box({ style: { width: 40, height: 3 } });
  const ta = new TextArea({
    value: "hello",
    placeholder: "Type here...",
    style: { flexGrow: 1 },
    focusable: true,
  });
  root.add(ta);
  ta.focus();
  const { canvas } = renderHeadless(root, 40, 3);

  expect(canvas.toString().includes("hello")).toBe(true);
  expect(canvas.toString().includes("Type here")).toBe(false);
});

test("flexShrink default 0: fixed-height header not compressed", () => {
  const root = new Box({ style: { flexDirection: "column", height: 5, width: 40 } });
  const header = new Box({ style: { height: 3 }, borderStyle: "single" });
  header.add(new Text("Hi"));
  const body = new Box({ style: { flexGrow: 1 } });
  body.add(new Text("body"));
  root.add(header);
  root.add(body);
  renderHeadless(root, 40, 5);

  expect(header.computedHeight).toBe(3);
  expect(body.computedHeight).toBe(2);
});

test("flexGrow fills remainder", () => {
  const root = new Box({ style: { flexDirection: "column", height: 10, width: 40 } });
  const fixed = new Box({ style: { height: 3 } });
  fixed.add(new Text("fixed"));
  const flex = new Box({ style: { flexGrow: 1 } });
  flex.add(new Text("flex"));
  root.add(fixed);
  root.add(flex);
  renderHeadless(root, 40, 10);

  expect(fixed.computedHeight).toBe(3);
  expect(flex.computedHeight).toBe(7);
});

test("ScrollBox scrollBy reveals later lines", () => {
  const { root, scrollbox } = buildAgentTree();
  renderHeadless(root, 80, 24);
  scrollbox.scrollBy(3);
  const { canvas } = renderHeadless(root, 80, 24);
  const lines = canvas.toString().split("\n");

  const contentRow = lines[6]!;
  expect(contentRow.includes("line 4")).toBe(true);
  expect(contentRow.includes("line 1")).toBe(false);
});

test("ScrollBox border still visible after scroll", () => {
  const { root, scrollbox } = buildAgentTree();
  renderHeadless(root, 80, 24);
  scrollbox.scrollBy(10);
  const { canvas } = renderHeadless(root, 80, 24);
  const lines = canvas.toString().split("\n");
  expect(lines[3]?.[0]).toBe("┌");
  expect(lines[3]?.[79]).toBe("┐");
  expect(lines[20]?.[0]).toBe("└");
  expect(lines[20]?.[79]).toBe("┘");
});

test("ScrollBox scissor clips items outside viewport, leaving neighbors visible", () => {
  const root = new Box({ style: { flexDirection: "column", width: 20, height: 10 } });
  const topBox = new Box({ style: { height: 2 } });
  topBox.add(new Text("TOP"));
  const sb = new ScrollBox({ style: { height: 6 } });
  for (let i = 0; i < 10; i++) sb.add(new Text(`row${i}`));
  const bottomBox = new Box({ style: { height: 2 } });
  bottomBox.add(new Text("BOT"));
  root.add(topBox);
  root.add(sb);
  root.add(bottomBox);
  const { canvas } = renderHeadless(root, 20, 10);
  const lines = canvas.toString().split("\n");

  expect(lines[0]?.includes("TOP")).toBe(true);
  expect(lines[2]?.includes("row0")).toBe(true);
  expect(lines[7]?.includes("row5")).toBe(true);

  expect(lines[8]?.includes("row6")).toBe(false);
  expect(lines[9]?.includes("row7")).toBe(false);
  expect(lines[8]?.includes("BOT")).toBe(true);
});

test("ScrollBox scrollTo clamps to maxScrollOffset", () => {
  const root = new Box({ style: { flexDirection: "column", width: 20, height: 10 } });
  const sb = new ScrollBox({ style: { height: 6 } });
  for (let i = 0; i < 10; i++) sb.add(new Text(`row${i}`));
  root.add(sb);
  renderHeadless(root, 20, 10);
  sb.scrollTo(1000);
  expect(sb.scrollOffset).toBe(sb.maxScrollOffset());
  expect(sb.scrollOffset).toBe(4);
});

test("ScrollBox scrollToBottom shows last rows at bottom of viewport", () => {
  const root = new Box({ style: { flexDirection: "column", width: 20, height: 10 } });
  const sb = new ScrollBox({ style: { height: 6 } });
  for (let i = 0; i < 10; i++) sb.add(new Text(`row${i}`));
  root.add(sb);
  renderHeadless(root, 20, 10);
  sb.scrollToBottom();
  const { canvas } = renderHeadless(root, 20, 10);
  const lines = canvas.toString().split("\n");
  expect(lines[0]?.includes("row4")).toBe(true);
  expect(lines[0]?.includes("row3")).toBe(false);
  expect(lines[5]?.includes("row9")).toBe(true);
});

test("TextArea in ScrollBox keeps consistent measured height across scrolls", () => {
  const root = new Box({ style: { flexDirection: "column", width: 30, height: 12 } });
  const sb = new ScrollBox({ style: { height: 4 } });
  const tall = new TextArea({ value: "a".repeat(60), style: {} });
  sb.add(tall);
  root.add(sb);
  renderHeadless(root, 30, 12);
  const h0 = tall.computedHeight;
  expect(h0).toBeGreaterThanOrEqual(2);
  sb.scrollBy(1);
  renderHeadless(root, 30, 12);
  expect(tall.computedHeight).toBe(h0);
});
