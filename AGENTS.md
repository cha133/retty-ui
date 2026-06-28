# AGENTS.md

## What this is

Terminal UI framework for Bun. Two layers sharing one imperative core:
- **Command-style API** (`retty-ui`) — `Renderable` tree + `Renderer`. Direct, no JSX.
- **React 19 binding** (`retty-ui/react`) — React reconciler → imperative setters. Thin adapter.

Layout is computed by [yoga-layout-tui](https://github.com/cha133/yoga-layout-tui) (pure-TS flexbox, no Zig, no WASM, no native binary). Target use case: coding-agent TUIs that need IME composing, focus, cursor state, and fast double-buffered diffing.

## Commands

```bash
# Typecheck
bun run typecheck          # tsc --noEmit

# Test (25 cases — 16 imperative + 9 React)
bun test                   # or: bun run test
bun run test:render        # only render.test.ts

# Lint (Biome v2)
bun run lint               # biome check
bun run lint:fix           # biome check --write --unsafe
bun run format             # biome format --write

# Demos (alternate screen, Ctrl+C to exit)
bun run example:imperative # examples/agent-imperative.ts
bun run example:react      # examples/agent-react.tsx
```

**Order after code changes:** `typecheck → lint → test`. All three must pass.

## Architecture

Three layers, bottom-up:

1. **`yoga-layout-tui`** — sibling package at `C:\Dev\yoga-layout-tui` (currently `file:../yoga-layout-tui`). Pure-TS flexbox, drop-in for the original `yoga-layout` npm API. See `C:\Dev\yoga-layout-tui\.claude\95-retty-ui-v0.3-integration.md` for our integration notes.
2. **`src/core/`** — imperative UI. `Renderable` base class (yoga node binding + dirty/focus/add/measure), `Renderer` (double-buffer diff + flush + alternate screen + autoFocus), `Canvas` (Uint32Array cells + ANSI), `Screen` (TTY escape sequences), `input.ts` (raw mode + key/mouse/paste decode), `text-layout.ts` (soft-wrap), `headless.ts` (`renderHeadless()` for tests).
3. **`src/components/`** — `Box` (flexbox container + 4 border styles + SGR flags + bg color), `Text` (single/multi-line), `TextArea` (IME composing + cursor + placeholder + onSubmit), `ScrollBox` (viewport + content + scrollBy/scrollTo/scrollToBottom).
4. **`src/react/`** — React 19 binding. `host-config.ts` (~200 lines, 60 methods, mutation mode), `reconciler.ts` (single ReactReconciler instance + ConcurrentRoot), `components.tsx` (PascalCase function components emitting lowercase hostConfig tags via `React.createElement`), `hooks.ts` (useApp / useInput / useMouse / usePaste / useFocus / useEffectEvent).

## Critical gotchas

- **`yoga-layout-tui` is a sibling dependency, not an npm dep.** `package.json` currently has `"yoga-layout-tui": "file:../yoga-layout-tui"`. Until the sibling package is published to npm, you can't `bun publish` this package — `npm install` will fail. Plan: switch to `^x.y.z` once `yoga-layout-tui` ships.
- **The 4 hot-patches live in `yoga-layout-tui`, not here.** If you change layout behavior and it regresses, check `C:\Dev\yoga-layout-tui\.claude\95-retty-ui-v0.3-integration.md` for the patch list (safeResolve / lineMainSize / STEP 9 fallback / childAbsX padding). Some patches may already be committed upstream — check git log first before re-patching.
- **`tsconfig.json` ships with `noEmit: true` and `module: Preserve`.** We publish source `.ts` directly; consumers must use a TS-aware bundler (Bun, tsx, Vite, esbuild) or run via `bun`. No `dist/` step.
- **`verbatimModuleSyntax` is on.** Use `import type` for type-only imports. Biome has `useImportType`/`useExportType` disabled to match.
- **`noImplicitOverride` is on.** Add `override` on methods redeclared from base class (including arrow-function fields).
- **`noUncheckedIndexedAccess` is on.** `arr[i]` is `T | undefined`. Biome has `noNonNullAssertion` disabled so `arr[i]!` is allowed.
- **React 19 reconciler protocol is strict.** The 60 methods in `host-config.ts` are NOT optional stubs — each must be implemented correctly or React will throw at runtime in dev mode. Don't gut methods to silence warnings.
- **PascalCase React components are required.** `<text>`/`<textarea>` clash with React 19's `JSX.IntrinsicElements` (SVG `text`, HTML `textarea`). PascalCase components in `components.tsx` emit lowercase hostConfig tags internally — don't refactor to JSX intrinsic elements.
- **`bun test` is safe.** Unlike v0.2, no native WASM tests get auto-discovered. Bare `bun test` works.
- **Commit style:** conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`), English, concise.

## Local working notes

`.claude/` is git-ignored — it's local working notes, not part of the published package. Read on session start to catch up on prior decisions, but don't `git add` it. Key files:

- `.claude/00-index.md` — doc index
- `.claude/01-state.md` — project status + roadmap
- `.claude/11-yoga-bridge.md` — yoga-layout-tui adapter layer notes
- `.claude/30-react-reconciler.md` — our React 19 hostConfig contract
- `.claude/91-opentui-react.md` — opentui reference notes
- `.claude/92-react-reconciler-protocol.md` — 60-method protocol table

## Reference sources

- `C:\Dev\opentui\packages\react\src\reconciler\host-config.ts` — primary reference for our React 19 hostConfig (mutated to fit our imperative core).
- `C:\Dev\opentui\packages\react\src/utils/index.ts` — `setProperty` dispatch table.
- `C:\Dev\yoga-layout-tui\` — sibling package. README + `.claude/95-...` for integration notes.
- `C:\Dev\retty-ui-v0.2\` (worktree) — prior imperative core, before yoga-layout-tui swap. Useful for behavioral reference.

## Publishing

This package is pre-release. To publish to npm:

1. Wait for `C:\Dev\yoga-layout-tui` to ship to npm.
2. Switch `"yoga-layout-tui": "file:../yoga-layout-tui"` → `"yoga-layout-tui": "^x.y.z"` in `package.json`.
3. `bun run check` → `bun test` → `bun run typecheck` → `bun run lint` — all 0 errors.
4. `bun pm pack --dry-run` — verify tarball contains only `src/`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`, `package.json`.
5. `bun publish`.