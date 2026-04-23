import { useState, useEffect } from "react";
import "./App.css";
import { GruposProvider } from "./GruposContext.jsx";
import Clasificacion from "./pages/Clasificacion.jsx";
import Partidos from "./pages/Partidos.jsx";
import Historial from "./pages/Historial.jsx";
import Jugadores from "./pages/Jugadores.jsx";
import PerfilJugador from "./pages/PerfilJugador.jsx";
import LoginPage from "./components/LoginPage.jsx";
import ProfilePanel from "./components/ProfilePanel.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { fetchConfig } from "./api.js";

const TABS = [
  {
    id: "historial",
    label: "Inicio",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "clasificacion",
    label: "Clasificación",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: "partidos",
    label: "Partidos",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer court */}
        <rect x="2" y="2" width="20" height="20" rx="0.5"/>
        {/* Singles sidelines */}
        <line x1="5"  y1="2"  x2="5"  y2="22"/>
        <line x1="19" y1="2"  x2="19" y2="22"/>
        {/* Net */}
        <line x1="2"  y1="12" x2="22" y2="12"/>
        {/* Service lines */}
        <line x1="5"  y1="7"  x2="19" y2="7"/>
        <line x1="5"  y1="17" x2="19" y2="17"/>
        {/* Center service line */}
        <line x1="12" y1="7"  x2="12" y2="17"/>
      </svg>
    ),
  },
  {
    id: "jugadores",
    label: "Jugadores",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const DEMO_PARAM = new URLSearchParams(window.location.search).get("demo") === "1";

export default function App() {
  const { user, isAdmin, loading, signInWithGoogle, signOut } = useAuth();
  const [tab, setTab] = useState("historial");
  const [clasiFiltro, setClasiFiltro] = useState({ cat: "Platino", grupo: "A", seq: 0 });
  const [perfilActivo, setPerfilActivo] = useState(null); // { jugador: string }
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [demoMode, setDemoMode] = useState(DEMO_PARAM);

  // ── Temporada global ──────────────────────────────────────────────────────
  // null = cargando; string = temporada seleccionada (default = activa en Config)
  const [temporadaSel, setTemporadaSel] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchConfig(controller.signal)
      .then(cfg => {
        if (cfg?.temporada) setTemporadaSel(cfg.temporada);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function irAClasificacion(cat, grupo) {
    setClasiFiltro({ cat, grupo, seq: Date.now() });
    setTab("clasificacion");
  }

  function irAPerfil(jugador) {
    setPerfilActivo({ jugador });
  }

  function volverDePerfil() {
    setPerfilActivo(null);
  }

  const PAGES = {
    historial:     <Historial irAClasificacion={irAClasificacion} isAdmin={isAdmin} temporadaSel={temporadaSel} onCambioTemporada={setTemporadaSel} />,
    clasificacion: <Clasificacion navTo={clasiFiltro} irAPerfil={irAPerfil} temporadaSel={temporadaSel} />,
    partidos:      <Partidos isAdmin={isAdmin} temporadaSel={temporadaSel} />,
    jugadores:     <Jugadores irAPerfil={irAPerfil} />,
  };

  // Auth loading
  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
          </path>
        </svg>
      </div>
    );
  }

  // Not authenticated → login
  if (!user && !demoMode) {
    return <LoginPage onSignIn={signInWithGoogle} loading={loading} onDemo={() => setDemoMode(true)} />;
  }

  const inicial = (user?.displayName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <GruposProvider>
      <div className="app-shell">

        {/* ── Avatar fijo top-right (solo si autenticado) ── */}
        {user && (
          <button
            className="avatar-btn"
            onClick={() => setPanelAbierto(true)}
            aria-label="Abrir perfil"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="avatar" />
            ) : (
              <span className="avatar-btn-initial">{inicial}</span>
            )}
          </button>
        )}

        {perfilActivo ? (
          <PerfilJugador
            jugador={perfilActivo.jugador}
            onVolver={volverDePerfil}
            irAPerfil={irAPerfil}
          />
        ) : (
          <>
            {PAGES[tab]}
            <nav className="bottom-nav">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`nav-tab ${tab === t.id ? "active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </nav>
          </>
        )}

        {/* ── Panel de perfil (solo si autenticado) ── */}
        {user && (
          <ProfilePanel
            open={panelAbierto}
            onClose={() => setPanelAbierto(false)}
            user={user}
            onSignOut={() => { setPanelAbierto(false); signOut(); }}
          />
        )}

      </div>
    </GruposProvider>
  );
}
