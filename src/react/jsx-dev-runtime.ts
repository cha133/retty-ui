// src/react/jsx-dev-runtime.ts — development JSX runtime re-export.
// React 19 dev runtime exports a single `jsxDEV` (not `jsx`/`jsxs`); bun/tsc
// pick this entry automatically when `jsxImportSource` is configured for dev.
// `package.json` exports this at "./react/jsx-dev-runtime".
export { Fragment, jsxDEV } from "react/jsx-dev-runtime";
