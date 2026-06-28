// src/react/host-config.ts — React 19 hostConfig (mutation mode).
//
// Pattern: opentui/packages/react/src/reconciler/host-config.ts
//          (https://github.com/anthropics/opentui — reference study)
//
// Mutation mode: supportsMutation:true. React calls appendChild/removeChild/
// insertBefore/commitUpdate/commitTextUpdate to mutate the existing TUI tree
// in place; we never re-create instances.
//
// All React 19 protocol methods are present. Anything not used by our TUI
// (Suspense, Form, Scope, Transitions) is a no-op stub.

import type { HostConfig } from "react-reconciler";
import { createContext } from "react";
import type { ReactContext } from "react-reconciler";
import { NoEventPriority, DefaultEventPriority } from "react-reconciler/constants";

import type { Container, Instance, Props, PublicInstance, TextInstance, Type } from "./types.ts";
import { Box } from "../components/box.ts";
import { Text } from "../components/text.ts";
import { TextArea } from "../components/textarea.ts";
import { ScrollBox } from "../components/scrollbox.ts";
import { setInitialProperties, updateProperties } from "./utils.ts";
import type { Renderable } from "../core/renderable.ts";

// ────────────────────────────────────────────────────────────────────────────
// Update priority — module-level (one renderer, no concurrent roots competing).
// ────────────────────────────────────────────────────────────────────────────

let currentUpdatePriority = NoEventPriority;

// ────────────────────────────────────────────────────────────────────────────
// Constructors — switch on type, build the imperative instance.
// ────────────────────────────────────────────────────────────────────────────

function constructInstance(type: Type, props: Props): Instance {
  switch (type) {
    case "box":
      return new Box(props as ConstructorParameters<typeof Box>[0]);
    case "text": {
      const text = (props["text"] as string) ?? "";
      const { text: _ignore, children: _c, ...rest } = props as Record<string, unknown>;
      return new Text(text, rest as ConstructorParameters<typeof Text>[1]) as Instance;
    }
    case "textarea":
      return new TextArea(props as ConstructorParameters<typeof TextArea>[0]) as Instance;
    case "scrollbox":
      return new ScrollBox(props as ConstructorParameters<typeof ScrollBox>[0]) as Instance;
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown component type: ${String(exhaustive)}`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// HostConfig
// ────────────────────────────────────────────────────────────────────────────

export const hostConfig: HostConfig<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  unknown, // SuspenseInstance
  unknown, // HydratableInstance
  unknown, // FormInstance
  PublicInstance,
  Record<string, never>, // HostContext
  unknown, // ChildSet
  ReturnType<typeof setTimeout>, // TimeoutHandle
  -1, // NoTimeout
  unknown // TransitionStatus
> = {
  // ── Modes ────────────────────────────────────────────────────────────────
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  supportsMicrotasks: true,
  scheduleMicrotask: queueMicrotask,

  // ── Core methods ────────────────────────────────────────────────────────
  createInstance(type, props, _root, _hostContext) {
    return constructInstance(type, props);
  },

  appendInitialChild(parent, child) {
    parent.add(child);
  },

  finalizeInitialChildren(instance, type, props) {
    setInitialProperties(instance, type, props);
    return false; // no post-mount work
  },

  shouldSetTextContent() {
    return false; // text always wrapped in <Text>
  },

  createTextInstance() {
    throw new Error("Text must be wrapped in <text>. Raw text nodes are not supported.");
  },

  getRootHostContext() {
    return {};
  },

  getChildHostContext(parentHostContext) {
    return parentHostContext;
  },

  getPublicInstance(instance) {
    // Direct ref passthrough — opentui/ink pattern. See plan §决策 5.
    return instance as unknown as PublicInstance;
  },

  prepareForCommit() {
    return null;
  },

  resetAfterCommit(container) {
    // Hook React commits into the imperative paint loop.
    container.requestRender();
  },

  preparePortalMount() {
    /* no-op */
  },

  // ── Tree mutation ───────────────────────────────────────────────────────
  appendChild(parent, child) {
    parent.add(child);
  },

  removeChild(parent, child) {
    parent.remove(child as Renderable);
  },

  insertBefore(parent, child, beforeChild) {
    // opentui pattern: ensure child is detached before re-adding at index.
    if (child.parent === parent) {
      parent.remove(child);
    }
    const idx = parent.children.indexOf(beforeChild as Renderable);
    parent.add(child as Renderable, idx === -1 ? undefined : idx);
  },

  appendChildToContainer(container, child) {
    container.rootBox.add(child as Renderable);
  },

  removeChildFromContainer(container, child) {
    container.rootBox.remove(child as Renderable);
  },

  insertInContainerBefore(container, child, beforeChild) {
    if (child.parent === container.rootBox) {
      container.rootBox.remove(child as Renderable);
    }
    const idx = container.rootBox.children.indexOf(beforeChild as Renderable);
    container.rootBox.add(child as Renderable, idx === -1 ? undefined : idx);
  },

  // ── Commit ──────────────────────────────────────────────────────────────
  commitMount() {
    // declarative `focused` prop is handled inside setProperty during
    // finalizeInitialChildren; no separate work needed here.
  },

  commitUpdate(instance, type, oldProps, newProps) {
    updateProperties(instance, type, oldProps, newProps);
  },

  commitTextUpdate() {
    throw new Error("Text nodes are not used; commitTextUpdate should not be called.");
  },

  // ── Visibility (mutation mode) ──────────────────────────────────────────
  hideInstance(instance) {
    instance.visible = false;
  },

  unhideInstance(instance) {
    instance.visible = true;
  },

  hideTextInstance() {
    throw new Error("Text nodes are not used.");
  },

  unhideTextInstance() {
    throw new Error("Text nodes are not used.");
  },

  // ── Cleanup ─────────────────────────────────────────────────────────────
  clearContainer(container) {
    // Snapshot children, then destroy each. We can't iterate while removing.
    const kids = [...container.rootBox.children];
    for (const k of kids) {
      container.rootBox.remove(k);
      k.destroy();
    }
  },

  detachDeletedInstance(instance) {
    // opentui pattern: only the truly orphaned (root) instance gets destroyed
    // here. Nested instances are torn down by their parent's destroy() which
    // calls removeAllChildren recursively.
    if (!instance.parent) {
      instance.destroy();
    }
  },

  // ── Timers ──────────────────────────────────────────────────────────────
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,

  // ── Update priority ─────────────────────────────────────────────────────
  setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority;
  },

  getCurrentUpdatePriority() {
    return currentUpdatePriority;
  },

  resolveUpdatePriority() {
    if (currentUpdatePriority !== NoEventPriority) return currentUpdatePriority;
    return DefaultEventPriority;
  },

  resolveEventType() {
    return null;
  },

  resolveEventTimeStamp() {
    return -1.1;
  },

  shouldAttemptEagerTransition() {
    return true;
  },

  // ── React 19 stubs ──────────────────────────────────────────────────────
  maySuspendCommit() {
    return false;
  },

  // maySuspendCommitOnUpdate / maySuspendCommitInSyncRender are React 19
  // additions that @types/react-reconciler@0.33 hasn't surfaced yet. Cast
  // through `unknown as` to add them without breaking the public HostConfig
  // type. (Same pattern opentui uses via ReconcilerExtensions.)
  ...({
    maySuspendCommitOnUpdate: () => false,
    maySuspendCommitInSyncRender: () => false,
  } as unknown as Record<string, unknown>),

  NotPendingTransition: null,

  HostTransitionContext: createContext(null) as unknown as ReactContext<null>,

  resetFormInstance() {
    /* no-op — no form instances */
  },

  requestPostPaintCallback() {
    /* no-op */
  },

  trackSchedulerEvent() {
    /* no-op */
  },

  preloadInstance() {
    return true;
  },

  startSuspendingCommit() {
    /* no-op — no Suspense */
  },

  suspendInstance() {
    /* no-op — no Suspense */
  },

  waitForCommitToBeReady() {
    return null;
  },

  prepareScopeUpdate() {
    /* no-op — no scope API */
  },

  getInstanceFromScope() {
    return null;
  },

  getInstanceFromNode() {
    return null;
  },

  beforeActiveInstanceBlur() {
    /* no-op */
  },

  afterActiveInstanceBlur() {
    /* no-op */
  },

  isPrimaryRenderer: true,

  // rendererPackageName / rendererVersion are React 19 additions missing from
  // @types/react-reconciler@0.33; same pattern as maySuspendCommitOnUpdate.
  ...({
    rendererPackageName: "retty-ui",
    rendererVersion: "0.3.0",
  } as unknown as Record<string, unknown>),
};