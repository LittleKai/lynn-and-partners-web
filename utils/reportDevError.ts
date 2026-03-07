/**
 * Sends error details to /api/_dev/errors so they appear on the /dev-errors page.
 * Call this inside catch blocks for operations you want to debug remotely (e.g. mobile).
 * Silently ignores any failure so it never disrupts the user flow.
 */
export function reportDevError(label: string, err: unknown): void {
  try {
    const ax = err as {
      message?: string;
      stack?: string;
      response?: { status?: number; data?: unknown };
    };

    const responseData = ax.response?.data;
    const status = ax.response?.status;

    const message = `[${label}] ${ax.message ?? String(err)}${status ? ` (HTTP ${status})` : ""}`;
    const stack = ax.stack ?? undefined;
    const detail = responseData !== undefined
      ? `Response data: ${JSON.stringify(responseData)}`
      : undefined;

    fetch("/api/_dev/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        stack: detail ? `${detail}\n\n${stack ?? ""}` : stack,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
    }).catch(() => {});
  } catch {
    // never throw from error reporter
  }
}
