import { useState } from "react";
import "./App.css";
import { GruposProvider } from "./GruposContext.jsx";
import Clasificacion from "./pages/Clasificacion.jsx";
import Partidos from "./pages/Partidos.jsx";
import Historial from "./pages/Historial.jsx";
import Jugadores from "./pages/Jugadores.jsx";
import Playoffs from "./pages/Playoffs.jsx";
import PerfilJugador from "./pages/PerfilJugador.jsx";

const TABS = [
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
  {
    id: "historial",
    label: "Inicio",
    center: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
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
  {
    id: "playoffs",
    label: "Playoffs",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
];

export default function App() {
  const [tab, setTab] = useState("historial");
  const [clasiFiltro, setClasiFiltro] = useState({ cat: "Platino", grupo: "A", seq: 0 });
  const [perfilActivo, setPerfilActivo] = useState(null); // { jugador: string }

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
    historial: <Historial irAClasificacion={irAClasificacion} />,
    clasificacion: <Clasificacion navTo={clasiFiltro} irAPerfil={irAPerfil} />,
    partidos: <Partidos />,
    jugadores: <Jugadores irAPerfil={irAPerfil} />,
    playoffs: <Playoffs />,
  };

  return (
    <GruposProvider>
      <div className="app-shell">
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
                  className={`nav-tab ${tab === t.id ? "active" : ""} ${t.center ? "center" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.center ? <span className="center-icon-wrap">{t.icon}</span> : t.icon}
                  {t.label}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </GruposProvider>
  );
}
