/**
 * Dev-only error viewer — open this page on any browser/tab to see
 * client-side errors sent from mobile devices in real-time.
 *
 * Route: /dev-errors  (excluded from auth + intl middleware)
 */
import { useEffect, useState, useCallback } from "react";

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  digest?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
}

export default function DevErrors() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [lastCount, setLastCount] = useState(0);
  const [status, setStatus] = useState<"polling" | "error">("polling");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);

  const fetchErrors = useCallback(async () => {
    try {
      const res = await fetch("/api/_dev/errors");
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setErrors(data.errors ?? []);
      setStatus("polling");
    } catch {
      setStatus("error");
    }
  }, []);

  // Poll every 2 seconds
  useEffect(() => {
    fetchErrors();
    const id = setInterval(fetchErrors, 2000);
    return () => clearInterval(id);
  }, [fetchErrors]);

  // Flash page title when new errors come in
  useEffect(() => {
    if (errors.length > lastCount && lastCount > 0) {
      document.title = `🔴 (${errors.length}) Dev Errors`;
    } else if (errors.length === 0) {
      document.title = "Dev Errors";
    } else {
      document.title = `(${errors.length}) Dev Errors`;
    }
    setLastCount(errors.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors.length]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAll = async () => {
    setClearing(true);
    await fetch("/api/_dev/errors", { method: "DELETE" });
    setErrors([]);
    setClearing(false);
    setExpanded(new Set());
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
  };

  return (
    <div style={{ margin: 0, padding: 0, background: "#0f0f0f", minHeight: "100vh", fontFamily: "ui-monospace, 'Cascadia Code', Menlo, monospace", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ background: "#1a1a2e", borderBottom: "1px solid #2d2d4a", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#a78bfa" }}>Dev Error Viewer</span>
          {errors.length > 0 ? (
            <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
              {errors.length}
            </span>
          ) : (
            <span style={{ background: "#22c55e", color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
              0
            </span>
          )}
          <span style={{ fontSize: 11, color: status === "error" ? "#ef4444" : "#4ade80" }}>
            {status === "error" ? "⚠ API unreachable" : "● polling"}
          </span>
        </div>
        <button
          onClick={clearAll}
          disabled={clearing || errors.length === 0}
          style={{ background: "#374151", color: "#f9fafb", border: "1px solid #4b5563", borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 12, opacity: errors.length === 0 ? 0.4 : 1 }}
        >
          {clearing ? "Clearing…" : "Clear all"}
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        {errors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ margin: 0, fontSize: 14 }}>No errors yet. Waiting for errors from your devices…</p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#4b5563" }}>Auto-polls every 2 seconds</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {errors.map((err, idx) => {
              const isOpen = expanded.has(err.id);
              const isNewest = idx === 0;
              return (
                <div
                  key={err.id}
                  style={{ background: "#1e1e2e", border: `1px solid ${isNewest ? "#7c3aed" : "#2d2d4a"}`, borderRadius: 8, overflow: "hidden" }}
                >
                  {/* Error header row */}
                  <button
                    onClick={() => toggleExpand(err.id)}
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "10px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, textAlign: "left" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        {isNewest && <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>NEW</span>}
                        <span style={{ color: "#94a3b8", fontSize: 11 }}>{fmtTime(err.timestamp)}</span>
                        {err.url && <span style={{ color: "#64748b", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{err.url.replace(/https?:\/\/[^/]+/, "")}</span>}
                      </div>
                      <div style={{ color: "#f87171", fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>
                        {err.message}
                      </div>
                    </div>
                    <span style={{ color: "#6b7280", fontSize: 16, flexShrink: 0, marginTop: 2 }}>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid #2d2d4a", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* Stack trace */}
                      {err.stack && (
                        <div>
                          <div style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stack Trace</div>
                          <pre style={{ background: "#0d0d1a", color: "#cbd5e1", margin: 0, padding: "10px 12px", borderRadius: 6, fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6 }}>
                            {err.stack}
                          </pre>
                        </div>
                      )}

                      {/* Metadata */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {err.digest && (
                          <div style={{ fontSize: 11 }}>
                            <span style={{ color: "#94a3b8" }}>Digest: </span>
                            <span style={{ color: "#e2e8f0" }}>{err.digest}</span>
                          </div>
                        )}
                        {err.url && (
                          <div style={{ fontSize: 11 }}>
                            <span style={{ color: "#94a3b8" }}>URL: </span>
                            <span style={{ color: "#e2e8f0" }}>{err.url}</span>
                          </div>
                        )}
                        {err.userAgent && (
                          <div style={{ fontSize: 11 }}>
                            <span style={{ color: "#94a3b8" }}>User-Agent: </span>
                            <span style={{ color: "#e2e8f0" }}>{err.userAgent}</span>
                          </div>
                        )}
                        <div style={{ fontSize: 11 }}>
                          <span style={{ color: "#94a3b8" }}>Time: </span>
                          <span style={{ color: "#e2e8f0" }}>{new Date(err.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
