/** Articles older than this leave the archive, and older feed items are never imported. */
export const RETENTION_DAYS = 30;

/** Articles each source keeps in the archive, the newest ones: the archive is meant to be read in full, about twenty articles. */
export const MAX_PER_SOURCE = 3;

/** Hacker News points a story needs to be imported, this value included: roughly the front page stories. */
export const HN_MIN_POINTS = 300;

/** Maximum excerpt length in characters, ellipsis included. */
export const EXCERPT_LENGTH = 300;

/** Limit for one feed request, body included. */
export const FETCH_TIMEOUT_MS = 15_000;

/** Tells feed hosts who is crawling and where to reach the owner. */
export const USER_AGENT = "frontwire (+https://github.com/GioManara96/frontwire)";
