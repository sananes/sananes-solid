import { addTick } from "~/integrations/motion/ticker"

/**
 * Frame-timing maths, kept free of the DOM so it can be driven by a fake clock
 * in tests.
 *
 * Averages hide the problem. A page that renders 58 frames in a second and
 * spends 120ms on one of them reads as "58 fps" and feels broken, so this
 * tracks the tail — p95, the worst frame, and how many frames missed the
 * budget — alongside the headline number.
 *
 * Deliberately cheap: a fixed ring buffer, no allocation per frame, and the
 * percentiles are only computed when something asks for a snapshot (the overlay
 * does that a few times a second, not every frame).
 */

/** Frames kept for the graph and the percentiles. Two seconds at 120Hz. */
export const HISTORY_SIZE = 240

/** A frame slower than this missed a 60Hz budget with room to spare. */
export const DROPPED_FRAME_MS = 1000 / 50

export interface FrameStats {
  /** Frames per second over the last completed second. */
  fps: number
  /** Lowest fps seen in any completed second since the last reset. */
  fpsMin: number
  /** Median frame time in milliseconds. */
  p50: number
  /** 95th percentile frame time — the jank the visitor actually notices. */
  p95: number
  /** Slowest single frame in the buffer. */
  worst: number
  /** Frames slower than `DROPPED_FRAME_MS`, since the last reset. */
  dropped: number
  /** Frames counted since the last reset. */
  frames: number
  /** Most recent frame times, oldest first. For the graph. */
  history: number[]
}

const EMPTY: FrameStats = {
  fps: 0,
  fpsMin: 0,
  p50: 0,
  p95: 0,
  worst: 0,
  dropped: 0,
  frames: 0,
  history: [],
}

export function createFrameSampler() {
  const buffer = new Float32Array(HISTORY_SIZE)
  // Scratch space for percentiles, so a snapshot allocates nothing.
  const sorted = new Float32Array(HISTORY_SIZE)

  let writeIndex = 0
  let filled = 0
  let frames = 0
  let dropped = 0

  let secondStartMs = 0
  let secondFrames = 0
  let fps = 0
  let fpsMin = 0

  function record(timeMs: number, deltaMs: number): void {
    buffer[writeIndex] = deltaMs
    writeIndex = (writeIndex + 1) % HISTORY_SIZE
    if (filled < HISTORY_SIZE) filled += 1

    frames += 1
    if (deltaMs > DROPPED_FRAME_MS) dropped += 1

    // The first window starts where the first frame began, not where it ended,
    // otherwise every window is short by one frame interval.
    if (secondFrames === 0 && frames === 1) secondStartMs = timeMs - deltaMs
    secondFrames += 1

    // Whole seconds only. A partial window would report a low fps every time
    // the overlay happened to read between frames.
    const elapsed = timeMs - secondStartMs
    if (elapsed >= 1000) {
      fps = Math.round((secondFrames * 1000) / elapsed)
      fpsMin = fpsMin === 0 ? fps : Math.min(fpsMin, fps)
      secondStartMs = timeMs
      secondFrames = 0
    }
  }

  function snapshot(): FrameStats {
    if (filled === 0) return EMPTY

    // Chronological order does not matter for percentiles, so the wrapped
    // buffer can be copied as-is.
    sorted.set(buffer.subarray(0, filled))
    const values = sorted.subarray(0, filled)
    values.sort()

    return {
      fps,
      fpsMin,
      p50: percentile(values, 0.5),
      p95: percentile(values, 0.95),
      worst: values[filled - 1] ?? 0,
      dropped,
      frames,
      history: history(),
    }
  }

  /** Frame times oldest first, so the graph reads left to right. */
  function history(): number[] {
    const out: number[] = new Array(filled)
    const start = filled < HISTORY_SIZE ? 0 : writeIndex
    for (let i = 0; i < filled; i++) {
      out[i] = buffer[(start + i) % HISTORY_SIZE] ?? 0
    }
    return out
  }

  function reset(): void {
    buffer.fill(0)
    writeIndex = 0
    filled = 0
    frames = 0
    dropped = 0
    secondStartMs = 0
    secondFrames = 0
    fps = 0
    fpsMin = 0
  }

  return { record, snapshot, reset }
}

export type FrameSampler = ReturnType<typeof createFrameSampler>

function percentile(sortedValues: Float32Array, fraction: number): number {
  const index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * fraction))
  return sortedValues[index] ?? 0
}

/**
 * Attach a sampler to the shared ticker from `~/integrations/motion`. Returns a teardown
 * function.
 *
 * Subscribing there rather than calling `requestAnimationFrame` is the point:
 * measuring from a second loop would both distort the numbers and add the
 * problem it is trying to report.
 */
export function startFrameSampler(sampler: FrameSampler): () => void {
  return addTick(sampler.record)
}
