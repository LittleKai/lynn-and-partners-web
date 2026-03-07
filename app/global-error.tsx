"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, padding: 16, fontFamily: "monospace", background: "#1a1a1a", color: "#ff6b6b", minHeight: "100vh" }}>
        <h2 style={{ color: "#ff6b6b", marginTop: 0 }}>Application Error</h2>

        <div style={{ marginBottom: 12 }}>
          <strong style={{ color: "#ffa07a" }}>Message:</strong>
          <pre style={{ background: "#2a2a2a", padding: 12, borderRadius: 6, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#ff6b6b", margin: "8px 0" }}>
            {error?.message || "Unknown error"}
          </pre>
        </div>

        {error?.digest && (
          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: "#ffa07a" }}>Digest:</strong>
            <pre style={{ background: "#2a2a2a", padding: 12, borderRadius: 6, color: "#aaa", margin: "8px 0" }}>
              {error.digest}
            </pre>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <strong style={{ color: "#ffa07a" }}>Stack:</strong>
          <pre style={{ background: "#2a2a2a", padding: 12, borderRadius: 6, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#ccc", margin: "8px 0", fontSize: 12 }}>
            {error?.stack || "No stack trace"}
          </pre>
        </div>

        <button
          onClick={reset}
          style={{ background: "#444", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
