/**
 * Lets the Sanity CLI's Vite toolchain start under Bun.
 *
 * Vite bundles `follow-redirects`, which builds its error classes at import time
 * with the pre-`class` idiom: a plain constructor whose `prototype` is set to
 * `new Error()`, calling `Error.captureStackTrace(this, this.constructor)` inside.
 * V8 attaches a stack to any object. JSC — and therefore Bun — requires a genuine
 * Error, and an object that merely *inherits* from one does not qualify, so it
 * throws `TypeError: First argument must be an Error object` while Vite is still
 * being imported. `sanity dev`, `build` and `deploy` all die there, before any
 * Sanity code runs, with no usable stack.
 *
 * `captureStackTrace` only attaches a `stack` property for diagnostics, so
 * failing to attach one costs nothing but a less precise trace on an error path
 * that is not being taken. This falls back to a real stack and carries on.
 *
 * Loaded via `preload` in `bunfig.toml`, which covers every `bun` and `bunx`
 * invocation in this workspace. Delete it once Bun accepts Error-prototyped
 * objects, or once Vite ships a `follow-redirects` that uses `class`.
 */

const captureStackTrace = Error.captureStackTrace

if (typeof captureStackTrace === "function") {
  Error.captureStackTrace = function patchedCaptureStackTrace(target, constructorOpt) {
    try {
      return captureStackTrace.call(Error, target, constructorOpt)
    } catch {
      if (target && typeof target === "object") {
        try {
          Object.defineProperty(target, "stack", {
            configurable: true,
            value: new Error().stack,
            writable: true,
          })
        } catch {
          // A frozen or exotic target is not worth failing an import over.
        }
      }
      return undefined
    }
  }
}
