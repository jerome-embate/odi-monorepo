/**
 * Absolute Laravel API URL for a path under `/api`. Server-side only (pages,
 * server actions, proxy): API_URL is never exposed to the browser.
 */
export function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) {
    throw new Error("API_URL is not set (see frontend/.env.local)");
  }
  return `${base.replace(/\/$/, "")}/api${path}`;
}
