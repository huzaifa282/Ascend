// packages/seed itself never imports a Vite `?url` asset; this exists only
// because typechecking it pulls in @ascendant/app's source (no separate
// declaration build between workspace packages), including
// platform/browser.ts, which does. A minimal local shim is simpler than
// making seed depend on `vite` just for its ambient types.
declare module '*?url' {
  const url: string;
  export default url;
}
