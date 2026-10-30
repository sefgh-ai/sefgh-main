// UI messages use fixed text; provider diagnostics are never displayed.
export async function trendingFailure(response, now = Date.now()) {
 const error = new Error(`status ${response.status}`);
 if (response.status !== 429) return error;
 let body;try { body = await response.json(); } catch { body = null; }
 const header = response.headers.get("Retry-After");
 let seconds = header && /^\d+$/.test(header.trim()) ? Number(header) : header ? Math.ceil((Date.parse(header)-now)/1000) : NaN;
 if (!Number.isFinite(seconds) || seconds < 0) { const reset = body?.rate_limit?.reset; seconds = (typeof reset === "string" || typeof reset === "number") && /^\d+$/.test(String(reset)) ? Math.ceil((Number(reset)*1000-now)/1000) : NaN; }
 error.rateLimited = true;
 error.retryAfterSeconds = Number.isSafeInteger(Math.ceil(seconds)) && seconds >= 0 ? Math.ceil(seconds) : null;
 return error;
}

export function popularRepositoryPath(dev) {
 const user = dev?.username, name = dev?.popularRepo?.name;
 if (typeof user !== "string" || user.length > 39 || !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(user)) return null;
 if (typeof name !== "string" || !/^[A-Za-z0-9_.-]+$/.test(name) || name === "." || name === "..") return null;
 return `/repo/${user}/${name}`;
}
