import { useState } from "react";

export default function LoginPage({ onSignIn, onDemo, loading: authLoading }) {
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignIn() {
    setSigning(true);
    setError(null);
    try {
      await onSignIn();
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
    } finally {
      setSigning(false);
    }
  }

  const busy = authLoading || signing;

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "24px",
    }}>
      {/* Logo / marca */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          boxShadow: "0 8px 32px rgba(55, 77, 245, 0.35)",
        }}>
          {/* Tennis court icon */}
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="0.5"/>
            <line x1="5"  y1="2"  x2="5"  y2="22"/>
            <line x1="19" y1="2"  x2="19" y2="22"/>
            <line x1="2"  y1="12" x2="22" y2="12"/>
            <line x1="5"  y1="7"  x2="19" y2="7"/>
            <line x1="5"  y1="17" x2="19" y2="17"/>
            <line x1="12" y1="7"  x2="12" y2="17"/>
          </svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text1)", letterSpacing: "-0.5px" }}>
          Nirbuntenis
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>
          Liga de tenis
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 360,
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "28px 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text1)", marginBottom: 6 }}>
          Accede a tu liga
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24, lineHeight: 1.5 }}>
          Inicia sesión con tu cuenta de Google para ver la clasificación y registrar resultados.
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={busy}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: busy ? "var(--bg3)" : "var(--bg3)",
            color: busy ? "var(--text2)" : "var(--text1)",
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
            transition: "background 0.15s, opacity 0.15s",
            opacity: busy ? 0.7 : 1,
            fontFamily: "inherit",
          }}
        >
          {busy ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
              </path>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {busy ? "Iniciando sesión..." : "Iniciar sesión con Google"}
        </button>
      </div>

      {/* Ver sin cuenta */}
      <button
        onClick={onDemo}
        style={{
          marginTop: 20,
          background: "none",
          border: "none",
          color: "var(--text2)",
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "inherit",
          textDecoration: "underline",
          textUnderlineOffset: 3,
          padding: 4,
        }}
      >
        Ver sin iniciar sesión →
      </button>

      <div style={{ marginTop: 12, fontSize: 11, color: "var(--text2)", textAlign: "center", lineHeight: 1.6 }}>
        Solo los miembros pueden registrar resultados.
      </div>
    </div>
  );
}
