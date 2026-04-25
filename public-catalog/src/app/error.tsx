"use client";
import { useEffect } from "react";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const message = typeof error?.message === "string" ? error.message : "";
    const isChunkError =
      message.includes("ChunkLoadError") ||
      message.includes("Failed to load chunk") ||
      message.includes("Loading chunk") ||
      message.includes("CSS_CHUNK_LOAD_FAILED");
    if (!isChunkError) return;

    try {
      const key = "ft_chunk_reload_count";
      const countRaw = sessionStorage.getItem(key);
      const count = countRaw ? Number(countRaw) : 0;
      if (Number.isFinite(count) && count >= 2) return;
      sessionStorage.setItem(key, String((Number.isFinite(count) ? count : 0) + 1));
      const url = new URL(window.location.href);
      url.searchParams.set("__reload", String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <h1 style={{ marginBottom: 12 }}>Something went wrong</h1>
        <p style={{ marginBottom: 8 }}>
          The application encountered an unexpected error. Please try again.
        </p>
        <pre
          style={{
            background: "#f5f5f5",
            padding: 12,
            borderRadius: 8,
            overflowX: "auto",
          }}
        >
          {error?.message}
        </pre>
        <button
          onClick={() => {
            try {
              sessionStorage.removeItem("ft_chunk_reload_count");
            } catch {}
            const message = typeof error?.message === "string" ? error.message : "";
            const isChunkError =
              message.includes("ChunkLoadError") ||
              message.includes("Failed to load chunk") ||
              message.includes("Loading chunk") ||
              message.includes("CSS_CHUNK_LOAD_FAILED");
            if (isChunkError) {
              try {
                const url = new URL(window.location.href);
                url.searchParams.set("__reload", String(Date.now()));
                window.location.replace(url.toString());
                return;
              } catch {}
              window.location.reload();
              return;
            }
            reset();
          }}
          style={{
            marginTop: 12,
            padding: "8px 12px",
            borderRadius: 8,
            background: "#111",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
