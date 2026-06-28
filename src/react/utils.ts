// src/react/utils.ts — single-point prop dispatch + differential style setter.
//
// Pattern borrowed from opentui:
//   https://github.com/anthropics/opentui/blob/main/packages/react/src/utils/index.ts
//
// `setProperty(instance, type, propKey, propValue, oldPropValue?)` is the only
// place that decides "given this prop, what imperative mutation do I make".
// `setStyle` does diff between old/new style objects (deletes stale keys by
// setting them to null/undefined, applies new keys, skips unchanged values).

import type { BorderStyle, Box } from "../components/Box.ts";
import type { ScrollBox } from "../components/ScrollBox.ts";
import type { Text } from "../components/Text.ts";
import type { TextArea } from "../components/TextArea.ts";
import type { LayoutStyle } from "../core/renderable.ts";
import type { Instance, Props, Type } from "./types.ts";

/**
 * Map a style value (string | number) into the typed union used by
 * Renderable.setStyle — passes through when the user already gave us a
 * LayoutStyle object (preferred path).
 */
function asLayoutStyle(value: unknown): LayoutStyle | undefined {
  if (value == null) return undefined;
  if (typeof value === "object") return value as LayoutStyle;
  return undefined;
}

/** Apply a single prop mutation. Returns nothing; errors are surfaced by caller. */
export function setProperty(
  instance: Instance,
  type: Type,
  propKey: string,
  propValue: unknown,
  oldPropValue?: unknown,
): void {
  // 1. `children` is handled by the reconciler's own tree ops.
  if (propKey === "children") return;

  // 2. `style` gets the diff path.
  if (propKey === "style") {
    setStyle(instance, asLayoutStyle(propValue), asLayoutStyle(oldPropValue));
    return;
  }

  // 3. `focused` is the declarative focus toggle (opentui pattern).
  if (propKey === "focused") {
    if (instance.focusable) {
      if (propValue) instance.focus();
      else instance.blur();
    }
    return;
  }

  // 4. `focusable` just flips the flag; we do not auto-focus here. Use the
  //    separate `focused` prop for that.
  if (propKey === "focusable") {
    instance.focusable = !!propValue;
    return;
  }

  // 5. Type-specific dispatches for the imperative methods that have no plain
  //    setter equivalent.
  switch (type) {
    case "box": {
      if (propKey === "borderStyle") {
        const color = (instance as Box)["borderColor" as keyof Box] as unknown;
        (instance as Box).setBorder(propValue as BorderStyle, color as string | number | undefined);
        return;
      }
      break;
    }
    case "text": {
      if (propKey === "text") {
        (instance as Text).text = propValue as string;
        return;
      }
      if (propKey === "wrap") {
        (instance as Text).setWrap(!!propValue);
        return;
      }
      break;
    }
    case "textarea": {
      if (propKey === "value") {
        (instance as TextArea).value = propValue as string;
        return;
      }
      if (propKey === "onSubmit") {
        (instance as TextArea).onSubmit = propValue as ((v: string) => void) | undefined;
        return;
      }
      if (propKey === "onChange") {
        (instance as TextArea).onChange = propValue as ((v: string) => void) | undefined;
        return;
      }
      break;
    }
    case "scrollbox": {
      if (propKey === "onScroll") {
        (instance as ScrollBox).onScroll = propValue as ((offset: number) => void) | undefined;
        return;
      }
      break;
    }
  }

  // 6. Generic imperative-set fallback. Most propKeys (color, backgroundColor,
  //    bold/italic/.../inverse, id, visible, borderColor, placeholder, etc.)
  //    have a matching field on the instance — writing it triggers the
  //    instance's setter, which in turn requests a repaint.
  if (propValue === undefined) {
    // Setting to undefined clears via the setter (which is null-safe).
    (instance as unknown as Record<string, unknown>)[propKey] = undefined;
  } else {
    (instance as unknown as Record<string, unknown>)[propKey] = propValue;
  }
}

/**
 * Differential style apply.
 *
 *  - Old keys that no longer exist in `styles` get reset to undefined.
 *  - Keys whose value changed get re-applied.
 *  - Unchanged keys are skipped (the imperative setter is itself idempotent
 *    but skipping is cheaper and avoids needless paints).
 */
function setStyle(
  instance: Instance,
  styles: LayoutStyle | undefined,
  oldStyles: LayoutStyle | undefined,
): void {
  // Drop stale keys. Layout fields don't have a direct setter on the
  // instance, so we use `setStyle` to round-trip through Renderable.setStyle,
  // which mutates the underlying Yoga node and recomputes layout.
  const diff: Partial<LayoutStyle> = {};
  let hasDiff = false;
  if (oldStyles) {
    for (const key of Object.keys(oldStyles) as Array<keyof LayoutStyle>) {
      if (!styles || !(key in styles)) {
        (diff as Record<string, unknown>)[key] = undefined;
        hasDiff = true;
      }
    }
  }
  if (styles) {
    for (const key of Object.keys(styles) as Array<keyof LayoutStyle>) {
      const v = styles[key];
      const oldV = oldStyles ? oldStyles[key] : undefined;
      if (v === oldV) continue;
      (diff as Record<string, unknown>)[key] = v;
      hasDiff = true;
    }
  }
  if (hasDiff) {
    instance.setStyle(diff);
  }
}

/** Apply all props from a fresh element. Called once during finalizeInitialChildren. */
export function setInitialProperties(instance: Instance, type: Type, props: Props): void {
  for (const key of Object.keys(props)) {
    const value = props[key];
    if (value == null) continue;
    setProperty(instance, type, key, value);
  }
}

/**
 * Differential update between an old and new props object.
 *
 *  - Keys removed in newProps get `setProperty(instance, type, key, null, oldValue)`.
 *  - Keys added or changed get `setProperty(instance, type, key, newValue, oldValue)`.
 */
export function updateProperties(
  instance: Instance,
  type: Type,
  oldProps: Props,
  newProps: Props,
): void {
  // Deletions.
  for (const key of Object.keys(oldProps)) {
    if (key === "children") continue;
    if (!(key in newProps)) {
      setProperty(instance, type, key, null, oldProps[key]);
    }
  }
  // Additions and changes.
  for (const key of Object.keys(newProps)) {
    if (key === "children") continue;
    const newVal = newProps[key];
    const oldVal = oldProps[key];
    if (newVal !== oldVal) {
      setProperty(instance, type, key, newVal, oldVal);
    }
  }
}
