import { describe, expect, it } from "vitest";
import { formatDate } from "../../shared/utils/format-date";

describe("formatDate", () => {
  it("runs in a time zone far from UTC", () => {
    // Guard: vitest.config.ts pins TZ to UTC+14. Without it the tests below could pass by accident.
    expect(new Date("2026-09-14T12:00:00Z").getDate()).toBe(15);
  });

  it("formats as a short US English date", () => {
    expect(formatDate("2026-09-14T12:19:00Z")).toBe("Sep 14, 2026");
  });

  it("keeps the UTC calendar day just after midnight", () => {
    expect(formatDate("2026-09-14T00:00:00Z")).toBe("Sep 14, 2026");
  });

  it("keeps the UTC calendar day just before midnight", () => {
    expect(formatDate("2026-09-14T23:59:59Z")).toBe("Sep 14, 2026");
  });
});
