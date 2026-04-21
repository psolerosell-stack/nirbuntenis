import { useState } from "react";
import "./App.css";
import { GruposProvider } from "./GruposContext.jsx";
import Clasificacion from "./pages/Clasificacion.jsx";
import Partidos from "./pages/Partidos.jsx";
import Historial from "./pages/Historial.jsx";
import Jugadores from "./pages/Jugadores.jsx";
import PerfilJugador from "./pages/PerfilJugador.jsx";

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
      </div>
    </GruposProvider>
  );
}
