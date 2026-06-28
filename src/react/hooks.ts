// src/react/hooks.ts — React-side hooks for retty-ui.
//
// `useApp()` returns the imperative Renderer + helpers bound to the current
// root. `useInput()` mirrors ink/opentui: every listener gets every keypress
// (focused.handleKeyPress already consumed some before fan-out). `useFocus()`
// is a thin ref-based helper for the common imperative focus pattern.
// `useEffectEvent()` is the opentui polyfill for React 19's stable-handler
// pattern (line refs + useLayoutEffect sync).

import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createContext } from "react";

import { inputManager, type KeyEvent, type MouseEvent } from "../core/input.ts";
import type { Renderable } from "../core/renderable.ts";
import type { Renderer } from "../core/renderer.ts";

// ────────────────────────────────────────────────────────────────────────────
// AppContext — set by render() via a wrapper, or read useApp() outside the
// tree to get the singleton. We use a single global handle that `render()`
// installs; React context is mostly cosmetic for v0.3 (YAGNI).
// ────────────────────────────────────────────────────────────────────────────

export interface AppContextValue {
  renderer: Renderer;
  unmount: () => void;
  exit: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
AppContext.displayName = "RettyAppContext";

// Module-level handle so `render()` can register a single root and hooks can
// pick it up even if no Provider is rendered (matches the "single-app"
// assumption of TUI renderers like ink).
let activeApp: AppContextValue | null = null;

export function setActiveApp(app: AppContextValue | null): void {
  activeApp = app;
}

/**
 * Returns the active app handle (Renderer + unmount/exit helpers).
 * Falls back to the most recently rendered app if no React Provider is in
 * scope. YAGNI for v0.3 — supports the common case where the entire tree is
 * one root rendered via `render(<App />, ...)`.
 */
export function useApp(): AppContextValue {
  const fromContext = useContext(AppContext);
  return useMemo(() => fromContext ?? activeApp ?? makeNoopApp(), [fromContext]);
}

function makeNoopApp(): AppContextValue {
  return {
    renderer: undefined as unknown as Renderer,
    unmount: () => {},
    exit: () => {},
  };
}

// ────────────────────────────────────────────────────────────────────────────
// useInput — fan-out, identical semantics to ink/opentui.
// ────────────────────────────────────────────────────────────────────────────

export interface UseInputOptions {
  /** When `false`, the listener is detached. Defaults to `true`. */
  isActive?: boolean;
}

export function useInput(
  handler: (input: string, key: KeyEvent) => void,
  options: UseInputOptions = {},
): void {
  const isActive = options.isActive ?? true;
  const stable = useEffectEvent(handler);

  useEffect(() => {
    if (!isActive) return;
    inputManager.addListener(stable);
    return () => {
      inputManager.removeListener(stable);
    };
  }, [isActive, stable]);
}

// ────────────────────────────────────────────────────────────────────────────
// useMouse — same fan-out pattern for mouse events.
// ────────────────────────────────────────────────────────────────────────────

export function useMouse(
  handler: (event: MouseEvent) => void,
  options: UseInputOptions = {},
): void {
  const isActive = options.isActive ?? true;
  const stable = useEffectEvent(handler);

  useEffect(() => {
    if (!isActive) return;
    inputManager.addMouseListener(stable);
    return () => {
      inputManager.removeMouseListener(stable);
    };
  }, [isActive, stable]);
}

// ────────────────────────────────────────────────────────────────────────────
// usePaste — bracketed paste buffer events.
// ────────────────────────────────────────────────────────────────────────────

export function usePaste(handler: (text: string) => void, options: UseInputOptions = {}): void {
  const isActive = options.isActive ?? true;
  const stable = useEffectEvent(handler);

  useEffect(() => {
    if (!isActive) return;
    inputManager.addPasteListener(stable);
    return () => {
      inputManager.removePasteListener(stable);
    };
  }, [isActive, stable]);
}

// ────────────────────────────────────────────────────────────────────────────
// useFocus — minimal imperative helper. Returns a callback that focuses the
// passed-in Renderable. For full "is this Renderable currently focused?"
// tracking, listen to imperative events on the Renderable directly via
// `onFocus`/`onBlur` callbacks (not exposed in v0.3, YAGNI).
// ────────────────────────────────────────────────────────────────────────────

export interface UseFocusApi {
  /** Imperatively focus the given Renderable (no-op if not focusable). */
  focus: (target: Renderable) => void;
  /** Imperatively blur the given Renderable. */
  blur: (target: Renderable) => void;
}

export function useFocus(): UseFocusApi {
  return useMemo(
    () => ({
      focus: (target) => target.focus(),
      blur: (target) => target.blur(),
    }),
    [],
  );
}

// ────────────────────────────────────────────────────────────────────────────
// useEffectEvent — opentui polyfill for React 19's experimental hook.
// https://github.com/anthropics/opentui/blob/main/packages/react/src/hooks/use-event.ts
//
// `handler` may close over fresh props/state; the returned callback stays
// referentially stable across renders, always invoking the latest handler.
// React 19.2+ ships an official `useEffectEvent`; we polyfill here so this
// package works on 18.3+ as well. Replace with the official hook when the
// minimum peer bumps.
// ────────────────────────────────────────────────────────────────────────────

export function useEffectEvent<T extends (...args: never[]) => unknown>(handler: T): T {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });
  return useCallback(((...args: Parameters<T>) => handlerRef.current(...args)) as T, []);
}