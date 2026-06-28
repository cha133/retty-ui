// src/core/yoga.ts — thin adapter around yoga-layout-tui.
//
// This file exists for two reasons:
//   1. v0.2's core referenced a Zig-FFI yoga binding. We swap that for
//      yoga-layout-tui (pure TS). The surface used by renderable.ts /
//      components is almost identical, so we re-export here with
//      shorter names matching v0.2's habit.
//   2. Edge enum was renamed to PhysicalEdge in yoga-layout-tui. We
//      expose it as both names so v0.2-style code reads naturally.
//
// API differences from v0.2 (Zig FFI) that callers must be aware of:
//   - `setFlexBasisAuto()` is gone. Use `setFlexBasis("auto")`.
//   - `setWidthAuto()` / `setHeightAuto()` are gone. Use
//     `setWidth("auto")` / `setHeight("auto")`.
//   - `setBoxSizing()` is gone. yoga-layout-tui is hardcoded border-box.
//   - `Wrap` is gone. yoga-layout-tui does not implement flex-wrap
//     (TUI subset — see C:\Dev\yoga-layout-tui\README.md "Hard
//     constraints"). TUI screens don't wrap, so this is fine.
//   - `Justify.SpaceAround` / `SpaceEvenly` enum values exist for
//     wire-compat but the algorithm ignores them. TUI subset only
//     honors FlexStart / Center / FlexEnd / SpaceBetween.
//   - `Align.Baseline` is gone. TUI subset only honors
//     FlexStart / Center / FlexEnd / Stretch.
//   - `Direction.RTL` is gone. TUI is LTR only.
//   - `setHasNewLayout(value)` setter is gone. The getter is public
//     (yoga-layout-tui sets it true after every calculateLayout pass);
//     callers that need to clear it should re-layout the subtree.
//
// Measure-cache semantics (the critical thing v0.1 got wrong):
//   yoga-layout-tui's 8-slot measure cache compares INPUT dimensions
//   only. If a measure function's output changes for the SAME input,
//   the cache still returns the stale output. **Callers must call
//   `yogaNode.markDirty()` whenever the measure source data changes.**
//   Our text/TextArea components do this on every value setter.

import {
  Node as YogaNode,
  Direction,
  FlexDirection,
  Justify,
  Align,
  PositionType,
  Display,
  Overflow,
  PhysicalEdge as Edge,
  MeasureMode,
  Gutter,
  type MeasureFunction,
} from "yoga-layout-tui";

// re-exports (keep names matching v0.2 for the rest of src/core/* to read
// naturally).
export {
  YogaNode as Node,
  Direction,
  FlexDirection,
  Justify,
  Align,
  PositionType,
  Display,
  Overflow,
  Edge,
  MeasureMode,
  Gutter,
  type MeasureFunction,
};

// v0.2 called this `Edge`; yoga-layout-tui renamed to `PhysicalEdge`
// because the algorithm is LTR-only and the physical (left/top/right/
// bottom) model is the only one that matters. Alias for muscle memory.
export { Edge as PhysicalEdge };
