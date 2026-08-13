export interface UnicornMouseInteractivity {
  disabled?: boolean
  disableMobile?: boolean
}

export interface UnicornInteractivity {
  mouse?: UnicornMouseInteractivity
}

export interface UnicornLayer {
  hide(): void
  show(): void
  setProp(name: string, value: unknown): void
  setTexture(name: string, value: unknown): void
}

export interface UnicornScene {
  paused: boolean
  destroy(): void
  resize(): void
  setVariable(name: string, value: unknown): void
  setVariables(values: Record<string, unknown>): void
  getVariable(name: string): unknown
  getLayer(idOrName: string): UnicornLayer | undefined
}

export interface UnicornAddSceneOptions {
  element?: HTMLElement
  elementId?: string
  /** Published Unicorn Studio embed id. Mutually exclusive with `filePath`. */
  projectId?: string
  /** Path to a self-hosted exported scene JSON. Mutually exclusive with `projectId`. */
  filePath?: string
  fps?: number
  scale?: number
  dpi?: number
  lazyLoad?: boolean
  fixed?: boolean
  altText?: string
  ariaLabel?: string
  production?: boolean
  initialVariables?: Record<string, unknown>
  initialPreset?: string
  interactivity?: UnicornInteractivity
  breakpoints?: Record<string, unknown>
}

/** `Window.UnicornStudio` is declared in `src/global.d.ts` — see the note there. */
export interface UnicornStudioGlobal {
  init(options?: { scale?: number; dpi?: number }): Promise<UnicornScene[]>
  addScene(options: UnicornAddSceneOptions): Promise<UnicornScene>
  destroy(): void
  setScroll(scrollY: number): void
  useNativeScroll(): void
}
