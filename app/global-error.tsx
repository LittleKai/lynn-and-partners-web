"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Send error to the dev error log (viewable on /dev-errors tab)
  useEffect(() => {
    try {
      fetch("/api/_dev/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message || "Unknown error",
          stack: error?.stack,
          digest: error?.digest,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch {
      // silent — don't let the error reporter itself throw
    }
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, padding: 16, fontFamily: "ui-monospace, Menlo, monospace", background: "#0f0f0f", color: "#e2e8f0", minHeight: "100vh" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", paddingTop: 24 }}>
          <div style={{ color: "#f87171", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
            Application Error
          </div>

          <div style={{ background: "#1e1e2e", border: "1px solid #7c3aed", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>MESSAGE</div>
            <div style={{ color: "#fca5a5", fontSize: 14, wordBreak: "break-word" }}>{error?.message || "Unknown error"}</div>
          </div>

          {error?.digest && (
            <div style={{ background: "#1e1e2e", border: "1px solid #2d2d4a", borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>DIGEST</div>
              <div style={{ color: "#e2e8f0", fontSize: 13 }}>{error.digest}</div>
            </div>
          )}

          {error?.stack && (
            <div style={{ background: "#1e1e2e", border: "1px solid #2d2d4a", borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>STACK TRACE</div>
              <pre style={{ margin: 0, color: "#94a3b8", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6 }}>
                {error.stack}
              </pre>
            </div>
          )}

          <div style={{ background: "#1a2e1a", border: "1px solid #166534", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: "#86efac" }}>
            ✓ Error sent to <strong>/dev-errors</strong> — open that tab on your computer to see full details
          </div>

          <button
            onClick={reset}
            style={{ background: "#6d28d9", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
