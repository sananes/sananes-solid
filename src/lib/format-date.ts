/**
 * Date formatting for content dates, which are bare ISO days like "2022-01-01".
 *
 * `new Date("2022-01-01")` is parsed as UTC midnight, so formatting it in the
 * viewer's zone renders December 2021 anywhere west of Greenwich. Everything
 * here formats in UTC so a date reads the same wherever the page is opened.
 */

const MONTH_YEAR: Intl.DateTimeFormatOptions = {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}

/** "2022-01-01" to "January 2022". Empty string for missing or unparseable input. */
export function formatMonthYear(value: string | null | undefined, locale = "en-US"): string {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleDateString(locale, MONTH_YEAR)
}
