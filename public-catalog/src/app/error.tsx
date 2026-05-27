"use client";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          onClick={() => reset()}
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
