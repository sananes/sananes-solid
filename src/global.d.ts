/// <reference types="@solidjs/start/env" />

declare global {
  interface Window {
    /**
     * Attached by the Unicorn Studio UMD bundle.
     *
     * Declared here rather than inside `~/integrations/unicorn-studio` because
     * `~/integrations/motion/lenis` calls `setScroll` without importing that
     * module. With the declaration living in the integration, deleting the
     * integration broke Lenis's typecheck for no visible reason; now the one
     * line to delete alongside it is here.
     */
    UnicornStudio?: import("~/integrations/unicorn-studio/types").UnicornStudioGlobal
  }
}

export {}
