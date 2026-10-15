"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#07090c", color: "#f5f5f2", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div>
            <p style={{ color: "#c6a15b", letterSpacing: "0.3em", fontSize: 11, textTransform: "uppercase" }}>TRIBUNA</p>
            <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 40 }}>Algo não saiu como esperado.</h1>
            <p style={{ color: "#a6abb4" }}>Tente novamente em instantes.</p>
            <button
              onClick={reset}
              style={{ marginTop: 24, padding: "12px 28px", borderRadius: 999, border: 0, background: "#c6a15b", color: "#140f06", fontWeight: 600, cursor: "pointer" }}
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
