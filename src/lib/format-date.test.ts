/**
 * What is guarded: that a bare ISO day formats to the month it was written as,
 * regardless of the machine's timezone — the reason this helper exists rather
 * than an inline toLocaleDateString — and that missing or malformed content
 * dates degrade to an empty label instead of "Invalid Date".
 *
 * Run with: bun test src/lib
 */

import { describe, expect, it } from "bun:test"

import { formatMonthYear } from "./format-date"

describe("formatMonthYear", () => {
  it("formats an ISO day as month and year", () => {
    expect(formatMonthYear("2022-01-01")).toBe("January 2022")
  })

  it("does not slip a month in timezones behind UTC", () => {
    // UTC midnight on the 1st is the previous month's last day in, say, UTC-8.
    expect(formatMonthYear("2024-03-01")).toBe("March 2024")
    expect(formatMonthYear("2024-01-01")).toBe("January 2024")
  })

  it("accepts a full timestamp", () => {
    expect(formatMonthYear("2025-08-01T00:00:00.000Z")).toBe("August 2025")
  })

  it("honours the requested locale", () => {
    expect(formatMonthYear("2022-06-01", "es-ES")).toBe("junio de 2022")
  })

  it("returns an empty label for an ongoing or absent date", () => {
    expect(formatMonthYear(null)).toBe("")
    expect(formatMonthYear(undefined)).toBe("")
    expect(formatMonthYear("")).toBe("")
  })

  it("returns an empty label rather than 'Invalid Date'", () => {
    expect(formatMonthYear("not a date")).toBe("")
  })
})
