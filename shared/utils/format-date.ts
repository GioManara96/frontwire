// Created once: the function is called from every card and the detail page.
const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/**
 * Formats an ISO 8601 UTC timestamp as a short US English date (`Sep 14, 2026`).
 * Time zone is pinned to UTC so the calendar day matches at generate time and in the browser.
 */
export function formatDate(iso: string): string {
  return formatter.format(new Date(iso));
}
