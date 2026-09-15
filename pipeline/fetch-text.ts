import { FETCH_TIMEOUT_MS, USER_AGENT } from "./config";

/** Body of the response at `url`: a feed or an API's JSON. Rejects on network errors, after `FETCH_TIMEOUT_MS`, and on non-2xx responses (`HTTP <status>`). */
export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
