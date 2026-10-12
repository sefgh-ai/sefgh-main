"use client";

/**
 * Last-resort boundary. Replaces Next.js's bare "Application error: a
 * client-side exception has occurred" with something that actually names the
 * failure, so it can be reported without opening devtools.
 *
 * global-error.js replaces the root layout entirely, so it must render its own
 * <html> and <body>.
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          color: "#fafafa",
          font: "400 15px/1.6 ui-sans-serif, system-ui, sans-serif",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 .5rem" }}>
            Something broke
          </h1>
          <p style={{ color: "#a1a1aa", margin: "0 0 1rem" }}>
            The app hit an error it could not recover from.
          </p>
          {error?.message ? (
            <pre
              style={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                padding: 12,
                overflowX: "auto",
                fontSize: 13,
                color: "#fca5a5",
                marginBottom: "1rem",
              }}
            >
              {error.message}
              {error.digest ? `\n\ndigest: ${error.digest}` : ""}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              font: "inherit",
              fontWeight: 500,
              cursor: "pointer",
              background: "#3b82f6",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: ".6rem 1.2rem",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
