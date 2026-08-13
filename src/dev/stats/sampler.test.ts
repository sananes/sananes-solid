/**
 * Frame-timing maths. The sampler takes time and delta as arguments rather than
 * reading a clock, so these drive it with exact frame sequences.
 *
 * What is guarded: the tail statistics are the point of this module, so a run of
 * good frames with one terrible frame in it must not read as healthy. Also that
 * fps is only reported for whole seconds, and that the ring buffer stays bounded
 * and chronological.
 *
 * Run with: bun test src/dev/stats
 */

import { describe, expect, it } from "bun:test"

import { createFrameSampler, DROPPED_FRAME_MS, HISTORY_SIZE } from "./sampler"

/** Feed a sequence of frame durations, advancing the clock by each. */
function feed(sampler: ReturnType<typeof createFrameSampler>, deltas: number[], startMs = 0) {
  let time = startMs
  for (const delta of deltas) {
    time += delta
    sampler.record(time, delta)
  }
  return time
}

const steady = (count: number, delta = 16.7) => new Array(count).fill(delta) as number[]

describe("frame statistics", () => {
  it("reports nothing before the first frame", () => {
    const sampler = createFrameSampler()
    const stats = sampler.snapshot()

    expect(stats.fps).toBe(0)
    expect(stats.frames).toBe(0)
    expect(stats.history).toEqual([])
  })

  it("reports fps only once a whole second has elapsed", () => {
    const sampler = createFrameSampler()

    const halfway = feed(sampler, steady(30))
    expect(sampler.snapshot().fps).toBe(0)

    feed(sampler, steady(30), halfway)
    expect(sampler.snapshot().fps).toBe(60)
  })

  it("counts frames that missed the budget", () => {
    const sampler = createFrameSampler()
    feed(sampler, [16, 16, 40, 16, 120, 16])

    const stats = sampler.snapshot()
    expect(stats.frames).toBe(6)
    expect(stats.dropped).toBe(2)
    expect(DROPPED_FRAME_MS).toBeGreaterThan(16)
  })

  it("surfaces a single terrible frame that an average would hide", () => {
    const sampler = createFrameSampler()
    // 59 good frames and one 120ms stall: ~58fps, and it feels broken.
    feed(sampler, [...steady(59, 16), 120])

    const stats = sampler.snapshot()
    expect(stats.p50).toBeCloseTo(16, 1)
    expect(stats.worst).toBeCloseTo(120, 1)
    expect(stats.dropped).toBe(1)
  })

  it("puts the jank in p95 once it is more than a one-off", () => {
    const sampler = createFrameSampler()
    feed(sampler, [...steady(90, 16), ...steady(10, 60)])

    const stats = sampler.snapshot()
    expect(stats.p50).toBeCloseTo(16, 1)
    expect(stats.p95).toBeGreaterThan(50)
  })

  it("tracks the worst completed second, not just the current one", () => {
    const sampler = createFrameSampler()

    // A full second at 60fps, then a full second at 20fps.
    const afterGoodSecond = feed(sampler, steady(60, 16.7))
    expect(sampler.snapshot().fps).toBe(60)

    feed(sampler, steady(20, 50), afterGoodSecond)

    const stats = sampler.snapshot()
    expect(stats.fps).toBe(20)
    expect(stats.fpsMin).toBe(20)
  })
})

describe("history buffer", () => {
  it("stays bounded and keeps the most recent frames, oldest first", () => {
    const sampler = createFrameSampler()
    const deltas = Array.from({ length: HISTORY_SIZE + 10 }, (_, i) => i + 1)
    feed(sampler, deltas)

    const { history } = sampler.snapshot()
    expect(history).toHaveLength(HISTORY_SIZE)
    expect(history[0]).toBeCloseTo(11, 5)
    expect(history[history.length - 1]).toBeCloseTo(HISTORY_SIZE + 10, 5)
  })

  it("grows to the number of frames seen while still filling", () => {
    const sampler = createFrameSampler()
    feed(sampler, [10, 20, 30])

    const { history } = sampler.snapshot()
    expect(history).toHaveLength(3)
    expect(history).toEqual([10, 20, 30])
  })
})

describe("reset", () => {
  it("clears every counter", () => {
    const sampler = createFrameSampler()
    feed(sampler, [...steady(120, 16), 200])

    sampler.reset()
    const stats = sampler.snapshot()

    expect(stats.frames).toBe(0)
    expect(stats.dropped).toBe(0)
    expect(stats.fps).toBe(0)
    expect(stats.fpsMin).toBe(0)
    expect(stats.worst).toBe(0)
    expect(stats.history).toEqual([])
  })
})
