// src/react/reconciler.ts — wraps the hostConfig into a ReactReconciler.
//
// Pattern: opentui/packages/react/src/reconciler/reconciler.ts
//
// We use `ConcurrentRoot` (React 18+ root) for concurrent rendering. Strict
// mode is off because it would double-invoke our imperative constructors
// (which allocate native Yoga nodes).

import ReactReconciler from "react-reconciler";
import { ConcurrentRoot } from "react-reconciler/constants";

import { hostConfig } from "./host-config.ts";
import type { Container } from "./types.ts";

export const reconciler = ReactReconciler(hostConfig);

export function createReactRoot(container: Container) {
  return reconciler.createContainer(
    container,
    ConcurrentRoot,
    null, // hydrationCallbacks
    false, // isStrictMode
    null, // concurrentUpdatesByDefaultOverride
    "", // identifierPrefix
    console.error, // onUncaughtError
    console.error, // onCaughtError
    console.error, // onRecoverableError
    () => {}, // formStateReuseHandler
  );
}

/**
 * Synchronously commit a React update to the container.
 *
 * react-reconciler@0.31+ removed `reconciler.flushSync`. The new documented
 * way to commit synchronously is `updateContainerSync` + `flushSyncWork`.
 * See https://github.com/facebook/react/issues/35424.
 *
 * Tests must wrap every container mutation in `mountReact` / `updateReact`
 * so React's concurrent scheduler flushes the commit before assertions.
 */
type SyncApi = {
  updateContainerSync?: (
    element: React.ReactElement | null,
    container: ReturnType<typeof createReactRoot>,
    parentComponent: unknown,
    callback: () => void,
  ) => void;
  flushSyncWork?: () => void;
};

const syncApi = reconciler as unknown as SyncApi;

export function mountReact(
  element: React.ReactElement,
  container: ReturnType<typeof createReactRoot>,
): void {
  if (syncApi.updateContainerSync && syncApi.flushSyncWork) {
    syncApi.updateContainerSync(element, container, null, () => {});
    syncApi.flushSyncWork();
  } else {
    // Fallback for older reconciler versions.
    reconciler.updateContainer(element, container, null, () => {});
  }
}

export function updateReact(
  element: React.ReactElement | null,
  container: ReturnType<typeof createReactRoot>,
): void {
  if (syncApi.updateContainerSync && syncApi.flushSyncWork) {
    syncApi.updateContainerSync(element, container, null, () => {});
    syncApi.flushSyncWork();
  } else {
    reconciler.updateContainer(element, container, null, () => {});
  }
}