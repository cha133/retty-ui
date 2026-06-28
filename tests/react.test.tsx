// tests/react.test.tsx — React 19 hostConfig regression tests.

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { act } from "react";
import { Box } from "../src/components/box.ts";
import { ScrollBox } from "../src/components/scrollbox.ts";
import { Text } from "../src/components/text.ts";
import { TextArea } from "../src/components/textarea.ts";
import { renderHeadless } from "../src/core/headless.ts";
import { inputManager } from "../src/core/input.ts";
import {
  Box as BoxComp,
  ScrollBox as ScrollBoxComp,
  TextArea as TextAreaComp,
  Text as TextComp,
} from "../src/react/components.tsx";
import { createReactRoot, reconciler } from "../src/react/reconciler.ts";
import type { Container } from "../src/react/types.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeContainer(rootBox: Box): Container {
  return { renderer: undefined as never, rootBox, requestRender: () => {} };
}

function mount(element: React.ReactElement, rootBox: Box) {
  const fiber = createReactRoot(makeContainer(rootBox));
  act(() => {
    reconciler.updateContainer(element, fiber, null, () => {});
  });
  return fiber;
}

function update(element: React.ReactElement | null, fiber: ReturnType<typeof createReactRoot>) {
  act(() => {
    reconciler.updateContainer(element, fiber, null, () => {});
  });
}

describe("React 19 hostConfig", () => {
  test("mount <Box><Text /></Box> creates imperative nodes", () => {
    const rootBox = new Box({ style: { flexDirection: "column", width: 80, height: 24 } });
    const fiber = mount(
      <BoxComp>
        <TextComp text="hi" />
      </BoxComp>,
      rootBox,
    );
    expect(rootBox.children.length).toBe(1);
    const box = rootBox.children[0]!;
    expect(box).toBeInstanceOf(Box);
    expect(box.children.length).toBe(1);
    const text = box.children[0]!;
    expect(text).toBeInstanceOf(Text);
    expect((text as Text).text).toBe("hi");
    update(null, fiber);
  });

  test("unmount clears the imperative tree", () => {
    const rootBox = new Box({});
    const fiber = mount(
      <BoxComp>
        <TextComp text="a" />
        <TextComp text="b" />
      </BoxComp>,
      rootBox,
    );
    expect(rootBox.children.length).toBe(1);
    const box = rootBox.children[0]!;
    expect(box.children.length).toBe(2);
    update(null, fiber);
    expect(rootBox.children.length).toBe(0);
  });

  test("ref forwards the imperative instance directly", () => {
    let captured: TextArea | null = null;
    const rootBox = new Box({});
    const fiber = mount(
      <TextAreaComp
        ref={(r) => {
          captured = r;
        }}
        value="hello"
      />,
      rootBox,
    );
    expect(captured).toBeInstanceOf(TextArea);
    expect(captured!.value).toBe("hello");
    captured!.value = "world";
    expect(captured!.value).toBe("world");
    update(null, fiber);
  });

  test("declarative focused prop drives focus()/blur()", () => {
    let captured: TextArea | null = null;
    const refSetter = (r: TextArea | null) => {
      captured = r;
    };
    const rootBox = new Box({});
    const fiber = mount(<TextAreaComp ref={refSetter} focusable focused={false} />, rootBox);
    expect(captured).not.toBeNull();
    const first = captured!;
    expect(first.focusable).toBe(true);
    expect(first.focused).toBe(false);

    update(<TextAreaComp ref={refSetter} focusable focused={true} />, fiber);
    expect(captured!.focused).toBe(true);

    update(null, fiber);
  });

  test("nested children don't double-destroy on unmount", () => {
    const rootBox = new Box({});
    const fiber = mount(
      <BoxComp>
        <BoxComp>
          <TextComp text="x" />
        </BoxComp>
      </BoxComp>,
      rootBox,
    );
    expect(() => update(null, fiber)).not.toThrow();
  });

  test("style prop applies to instance", () => {
    let captured: Box | null = null;
    const refSetter = (r: Box | null) => {
      captured = r;
    };
    const rootBox = new Box({ style: { width: 80, height: 24 } });
    const fiber = mount(<BoxComp ref={refSetter} style={{ width: 10, height: 5 }} />, rootBox);
    // Verify the props landed on the instance's Renderable.style.
    expect(captured!.style.width).toBe(10);
    expect(captured!.style.height).toBe(5);
    update(null, fiber);
  });

  test("useInput fan-out: two listeners both receive a key", () => {
    let count = 0;
    function App() {
      React.useEffect(() => {
        const handler = () => count++;
        inputManager.addListener(handler);
        return () => inputManager.removeListener(handler);
      }, []);
      React.useEffect(() => {
        const handler = () => count++;
        inputManager.addListener(handler);
        return () => inputManager.removeListener(handler);
      }, []);
      return <BoxComp />;
    }
    const rootBox = new Box({});
    const fiber = mount(<App />, rootBox);
    // _testHandleData is exposed via the module's exported helpers.
    const testHandleData = _testHandleData as unknown as (data: string) => void;
    testHandleData("a");
    expect(count).toBe(2);
    update(null, fiber);
  });

  test("ScrollBox ref forwards the ScrollBox instance", () => {
    let captured: ScrollBox | null = null;
    const refSetter = (r: ScrollBox | null) => {
      captured = r;
    };
    const rootBox = new Box({});
    const fiber = mount(
      <ScrollBoxComp ref={refSetter} style={{ flexGrow: 1 }}>
        <TextComp text="a" />
      </ScrollBoxComp>,
      rootBox,
    );
    expect(captured).toBeInstanceOf(ScrollBox);
    expect(captured!.scrollOffset).toBe(0);
    update(null, fiber);
  });

  test("renderHeadless produces a usable Canvas from a React tree", () => {
    const rootBox = new Box({ style: { flexDirection: "column", width: 10, height: 3 } });
    const fiber = mount(
      <BoxComp style={{ width: 10, height: 3, flexDirection: "column" }}>
        <TextComp text="hello" />
      </BoxComp>,
      rootBox,
    );
    const { canvas } = renderHeadless(rootBox, 10, 3);
    expect(canvas.width).toBe(10);
    expect(canvas.height).toBe(3);
    expect(canvas.buffer[0]! & 0x1fffff).toBe("h".codePointAt(0)!);
    update(null, fiber);
  });
});

// _testHandleData is a module-level helper exported from ../src/core/input.ts.
// Importing it here avoids reaching into inputManager's private state.
import { _testHandleData } from "../src/core/input.ts";
