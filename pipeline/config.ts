/** Articles older than this leave the archive, and older feed items are never imported. */
export const RETENTION_DAYS = 30;

/** Maximum excerpt length in characters, ellipsis included. */
export const EXCERPT_LENGTH = 300;

/** Limit for one feed request, body included. */
export const FETCH_TIMEOUT_MS = 15_000;

/** Tells feed hosts who is crawling and where to reach the owner. */
export const USER_AGENT = "frontwire (+https://github.com/GioManara96/frontwire)";
